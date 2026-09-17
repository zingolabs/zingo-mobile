//! The pull-based stream a host reads wallet events from.

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use tokio::sync::broadcast::error::RecvError;
use tokio::sync::{Mutex, Notify, broadcast};

use crate::runtime;
use crate::types::WalletEvent;

/// One consumer's view of a wallet's events, read with `next` until `cancel` or the wallet closes.
#[derive(uniffi::Object)]
pub struct EventStream {
    receiver: Mutex<broadcast::Receiver<WalletEvent>>,
    cancelled: AtomicBool,
    cancel: Notify,
}

impl EventStream {
    pub(crate) fn new(receiver: broadcast::Receiver<WalletEvent>) -> Arc<Self> {
        Arc::new(Self {
            receiver: Mutex::new(receiver),
            cancelled: AtomicBool::new(false),
            cancel: Notify::new(),
        })
    }

    async fn recv(self: Arc<Self>) -> Option<WalletEvent> {
        if self.cancelled.load(Ordering::Acquire) {
            return None;
        }
        let mut receiver = self.receiver.lock().await;
        tokio::select! {
            outcome = receiver.recv() => match outcome {
                Ok(event) => Some(event),
                Err(RecvError::Lagged(missed)) => Some(WalletEvent::Lagged { missed }),
                Err(RecvError::Closed) => None,
            },
            _ = self.cancel.notified() => None,
        }
    }
}

#[uniffi::export(async_runtime = "tokio")]
impl EventStream {
    /// The next event, or `None` once the stream is cancelled or its wallet is closed.
    pub async fn next(self: Arc<Self>) -> Option<WalletEvent> {
        let stream = self.clone();
        runtime::run(async move { Ok(stream.recv().await) })
            .await
            .unwrap_or(None)
    }

    /// Ends the stream, unblocking a pending `next` with `None`.
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::Release);
        self.cancel.notify_waiters();
        self.cancel.notify_one();
    }
}

/// Tests that a pending `next` returns `None` once the stream is cancelled,
/// and that later calls return `None` at once.
#[cfg(test)]
mod event_stream_tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn cancel_ends_a_pending_next() {
        let (sender, receiver) = broadcast::channel(4);
        let stream = EventStream::new(receiver);
        let waiting = stream.clone();
        let pending = runtime::RT.spawn(async move { waiting.next().await });
        std::thread::sleep(Duration::from_millis(50));
        stream.cancel();
        let outcome = runtime::RT.block_on(pending).expect("the wait must finish");
        assert_eq!(outcome, None);
        assert_eq!(runtime::RT.block_on(stream.clone().next()), None);
        drop(sender);
    }

    #[test]
    fn a_published_event_reaches_the_stream() {
        let (sender, receiver) = broadcast::channel(4);
        let stream = EventStream::new(receiver);
        sender
            .send(WalletEvent::Lagged { missed: 7 })
            .expect("a receiver exists");
        assert_eq!(
            runtime::RT.block_on(stream.next()),
            Some(WalletEvent::Lagged { missed: 7 })
        );
    }
}
