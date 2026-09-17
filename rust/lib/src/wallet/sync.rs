//! Sync as a detached process: start, pause, resume, and the watcher that turns its status into events.

use std::panic::AssertUnwindSafe;
use std::sync::Arc;
use std::time::Duration;

use pepper_sync::error::SyncModeError;
use pepper_sync::wallet::SyncMode as SyncModeUpstream;
use zingolib::data::PollReport;
use zingolib::lightclient::error::LightClientError;
use zingolib::netutils::GrpcIndexer;

use super::Wallet;
use crate::error::{ZingoError, ffi_error, sync_failure};
use crate::runtime::{self, AbortOnDrop};
use crate::types::{SyncMode, SyncStatus, WalletEvent};

const SYNC_WATCH_INTERVAL: Duration = Duration::from_millis(500);
const PENDING_INDEXER_DIAL_TIMEOUT: Duration = Duration::from_secs(5);

/// Redials the URI left pending by an offline open, attaching the Indexer when the dial connects.
async fn attach_pending_indexer(wallet: &Wallet) {
    let Some(uri) = wallet.take_pending_indexer() else {
        return;
    };
    let reachable =
        tokio::time::timeout(PENDING_INDEXER_DIAL_TIMEOUT, GrpcIndexer::new(uri.clone())).await;
    if !matches!(reachable, Ok(Ok(_))) {
        return;
    }
    let Ok(mut client) = wallet.client_write().await else {
        return;
    };
    let attached = tokio::time::timeout(PENDING_INDEXER_DIAL_TIMEOUT, client.set_indexer_uri(uri))
        .await
        .is_ok_and(|outcome| outcome.is_ok());
    if attached {
        wallet.set_pending_indexer(None);
    }
}

#[uniffi::export(async_runtime = "tokio")]
impl Wallet {
    /// Launches sync, or resumes a paused one, and returns as soon as the task runs.
    pub async fn start_sync(self: Arc<Self>) -> Result<(), ZingoError> {
        self.run("start_sync", move |w| async move {
            attach_pending_indexer(&w).await;
            let mut client = w.client_write().await?;
            if client.sync_mode() == SyncModeUpstream::Paused {
                return client.resume_sync().map_err(ZingoError::sync_mode);
            }
            match client.sync().await {
                Ok(()) => Ok(()),
                Err(LightClientError::SyncModeError(SyncModeError::SyncAlreadyRunning)) => Ok(()),
                Err(e) => Err(ffi_error(e)),
            }
        })
        .await
    }

    /// Launches a rescan from the wallet birthday and returns as soon as the task runs.
    pub async fn start_rescan(self: Arc<Self>) -> Result<(), ZingoError> {
        self.run("start_rescan", move |w| async move {
            attach_pending_indexer(&w).await;
            let mut client = w.client_write().await?;
            client.rescan().await.map_err(ffi_error)
        })
        .await
    }

    pub async fn pause_sync(self: Arc<Self>) -> Result<(), ZingoError> {
        self.run("pause_sync", move |w| async move {
            let client = w.client_read().await?;
            client.pause_sync().map_err(ZingoError::sync_mode)
        })
        .await
    }

    pub async fn resume_sync(self: Arc<Self>) -> Result<(), ZingoError> {
        self.run("resume_sync", move |w| async move {
            let client = w.client_read().await?;
            client.resume_sync().map_err(ZingoError::sync_mode)
        })
        .await
    }

    pub async fn sync_mode(self: Arc<Self>) -> Result<SyncMode, ZingoError> {
        self.run("sync_mode", move |w| async move {
            let client = w.client_read().await?;
            Ok(SyncMode::from(client.sync_mode()))
        })
        .await
    }

    /// The sync engine's status as the watcher last read it, at most one watch interval old.
    pub async fn sync_status(self: Arc<Self>) -> Result<Option<SyncStatus>, ZingoError> {
        self.run("sync_status", move |w| async move { Ok(w.sync_snapshot()) })
            .await
    }
}

/// Publishes sync progress and completion as events for the wallet's lifetime.
pub(crate) fn spawn_sync_watcher(wallet: &Arc<Wallet>) -> AbortOnDrop<()> {
    let wallet = wallet.clone();
    runtime::spawn(async move {
        let mut last: Option<SyncStatus> = None;
        let mut running = false;
        loop {
            tokio::time::sleep(SYNC_WATCH_INTERVAL).await;
            if wallet.is_closed() {
                return;
            }
            if wallet.running_job().is_some() {
                continue;
            }
            let Ok(guard) = wallet.client.try_read() else {
                continue;
            };
            let Some(client) = guard.as_ref() else { return };
            let status = client.latest_sync_status().map(SyncStatus::from);
            let mode = client.sync_mode();
            drop(guard);
            wallet.set_sync_snapshot(status.clone());
            if status.is_some() && status != last {
                if let Some(snapshot) = status.clone() {
                    wallet.publish(WalletEvent::SyncProgress { status: snapshot });
                }
                last = status;
            }
            if mode == SyncModeUpstream::Running || mode == SyncModeUpstream::Paused {
                running = true;
                continue;
            }
            if !running {
                continue;
            }
            let Ok(mut guard) = wallet.client.try_write() else {
                continue;
            };
            let Some(client) = guard.as_mut() else { return };
            let report = std::panic::catch_unwind(AssertUnwindSafe(|| client.poll_sync()));
            match report {
                Ok(PollReport::Ready(Ok(result))) => {
                    running = false;
                    let capture = client.capture_migration_witnesses().await;
                    drop(guard);
                    if let Err(e) = capture {
                        wallet.publish(WalletEvent::SyncFailed {
                            error: ffi_error(e),
                        });
                    }
                    wallet.publish(WalletEvent::SyncComplete {
                        result: result.into(),
                    });
                }
                Ok(PollReport::Ready(Err(e))) => {
                    running = false;
                    drop(guard);
                    wallet.publish(WalletEvent::SyncFailed {
                        error: sync_failure(e),
                    });
                }
                Ok(PollReport::NoHandle) => {
                    running = false;
                }
                Ok(PollReport::NotReady) => {}
                Err(_) => {
                    running = false;
                    drop(guard);
                    wallet.publish(WalletEvent::SyncFailed {
                        error: ZingoError::Panic {
                            detail: "the sync task panicked".to_string(),
                        },
                    });
                }
            }
        }
    })
}
