//! The wallet object: one open zingolib client, its event channel, and the rules every call obeys.

mod address;
mod migration;
mod mixnet;
mod open;
mod read;
mod send;
mod sync;
#[cfg(test)]
mod tests;

use std::future::Future;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tokio::sync::{
    RwLock, RwLockMappedWriteGuard, RwLockReadGuard, RwLockWriteGuard, broadcast, watch,
};
use zingolib::lightclient::LightClient;
use zingolib::mixnet::MixnetStatus as MixnetStatusUpstream;
use zingolib::wallet::LightWallet;

use crate::error::ZingoError;
use crate::events::EventStream;
use crate::registry;
use crate::runtime::{self, AbortOnDrop};
use crate::types::{JobKind, SyncStatus, WalletEvent};

const EVENT_CAPACITY: usize = 256;
const PROGRESS_INTERVAL: Duration = Duration::from_millis(250);

/// An open wallet: reads go to the wallet data, mutations take the client, and one job runs at a time.
#[derive(uniffi::Object)]
pub struct Wallet {
    client: RwLock<Option<LightClient>>,
    data: Arc<RwLock<LightWallet>>,
    events: broadcast::Sender<WalletEvent>,
    poisoned: Mutex<Option<String>>,
    job: Mutex<Option<JobKind>>,
    pending_indexer: Mutex<Option<http::Uri>>,
    mixnet: watch::Receiver<MixnetStatusUpstream>,
    sync_snapshot: Mutex<Option<SyncStatus>>,
    closed: AtomicBool,
    watchers: Mutex<Vec<AbortOnDrop<()>>>,
}

/// Clears the wallet's job slot when the job's future ends, however it ends.
pub(crate) struct JobGuard(Arc<Wallet>);

impl Drop for JobGuard {
    fn drop(&mut self) {
        *self.0.job.lock().unwrap_or_else(|p| p.into_inner()) = None;
    }
}

impl Wallet {
    pub(crate) fn attach(client: LightClient, pending_indexer: Option<http::Uri>) -> Arc<Self> {
        let data = client.wallet().clone();
        let mixnet = client.subscribe_mixnet_status();
        let (events, _) = broadcast::channel(EVENT_CAPACITY);
        let wallet = Arc::new(Self {
            client: RwLock::new(Some(client)),
            data,
            events,
            poisoned: Mutex::new(None),
            job: Mutex::new(None),
            pending_indexer: Mutex::new(pending_indexer),
            mixnet,
            sync_snapshot: Mutex::new(None),
            closed: AtomicBool::new(false),
            watchers: Mutex::new(Vec::new()),
        });
        wallet.spawn_watchers();
        if let Some(previous) = registry::register(wallet.clone()) {
            previous.stop_watchers();
        }
        wallet
    }

    fn spawn_watchers(self: &Arc<Self>) {
        let watchers = vec![
            sync::spawn_sync_watcher(self),
            mixnet::spawn_mixnet_watcher(self),
        ];
        *self.watchers.lock().unwrap_or_else(|p| p.into_inner()) = watchers;
    }

    /// Stops the watchers and marks the wallet closed, without touching the client.
    fn stop_watchers(&self) {
        self.closed.store(true, Ordering::Release);
        self.watchers
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .clear();
    }

    pub(crate) fn is_closed(&self) -> bool {
        self.closed.load(Ordering::Acquire)
    }

    fn check(&self) -> Result<(), ZingoError> {
        if self.is_closed() {
            return Err(ZingoError::Closed);
        }
        if let Some(detail) = self
            .poisoned
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .clone()
        {
            return Err(ZingoError::Poisoned { detail });
        }
        Ok(())
    }

    fn poison(&self, detail: &str) {
        let mut slot = self.poisoned.lock().unwrap_or_else(|p| p.into_inner());
        if slot.is_none() {
            *slot = Some(detail.to_string());
        }
    }

    /// Runs `work` on the runtime under the wallet's rules: a closed or
    /// poisoned wallet refuses, a panic poisons, and every failure is logged.
    pub(crate) async fn run<T, F, Fut>(
        self: &Arc<Self>,
        op: &'static str,
        work: F,
    ) -> Result<T, ZingoError>
    where
        T: Send + 'static,
        F: FnOnce(Arc<Wallet>) -> Fut + Send + 'static,
        Fut: Future<Output = Result<T, ZingoError>> + Send + 'static,
    {
        self.check()?;
        let wallet = self.clone();
        let outcome = runtime::run(async move { work(wallet).await }).await;
        if let Err(error) = &outcome {
            if let ZingoError::Panic { detail } = error {
                self.poison(detail);
            }
            log::error!(target: "zingo::ffi", op = op, tag = error.tag(); "{error}");
        }
        outcome
    }

    pub(crate) fn running_job(&self) -> Option<JobKind> {
        *self.job.lock().unwrap_or_else(|p| p.into_inner())
    }

    fn no_job(&self) -> Result<(), ZingoError> {
        match self.running_job() {
            Some(running) => Err(ZingoError::Busy { running }),
            None => Ok(()),
        }
    }

    /// Claims the job slot for `kind`, or refuses with `Busy`.
    pub(crate) fn begin_job(self: &Arc<Self>, kind: JobKind) -> Result<JobGuard, ZingoError> {
        let mut slot = self.job.lock().unwrap_or_else(|p| p.into_inner());
        if let Some(running) = *slot {
            return Err(ZingoError::Busy { running });
        }
        *slot = Some(kind);
        Ok(JobGuard(self.clone()))
    }

    /// The client for a read, taken only while no job holds it.
    pub(crate) async fn client_read(&self) -> Result<RwLockReadGuard<'_, LightClient>, ZingoError> {
        self.no_job()?;
        let guard = self.client.read().await;
        RwLockReadGuard::try_map(guard, |slot| slot.as_ref()).map_err(|_| ZingoError::Closed)
    }

    /// The client for a mutation, taken only while no job holds it.
    pub(crate) async fn client_write(
        &self,
    ) -> Result<RwLockMappedWriteGuard<'_, LightClient>, ZingoError> {
        self.no_job()?;
        let guard = self.client.write().await;
        RwLockWriteGuard::try_map(guard, |slot| slot.as_mut()).map_err(|_| ZingoError::Closed)
    }

    /// The client for a job, whose guard the job holds for its whole duration.
    pub(crate) async fn client_for_job(
        &self,
    ) -> Result<RwLockMappedWriteGuard<'_, LightClient>, ZingoError> {
        let guard = self.client.write().await;
        RwLockWriteGuard::try_map(guard, |slot| slot.as_mut()).map_err(|_| ZingoError::Closed)
    }

    pub(crate) fn data(&self) -> &Arc<RwLock<LightWallet>> {
        &self.data
    }

    pub(crate) fn publish(&self, event: WalletEvent) {
        let _ = self.events.send(event);
    }

    /// The mixnet status channel, subscribed once at open and readable without the client.
    pub(crate) fn mixnet(&self) -> watch::Receiver<MixnetStatusUpstream> {
        self.mixnet.clone()
    }

    pub(crate) fn sync_snapshot(&self) -> Option<SyncStatus> {
        self.sync_snapshot
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .clone()
    }

    pub(crate) fn set_sync_snapshot(&self, status: Option<SyncStatus>) {
        *self.sync_snapshot.lock().unwrap_or_else(|p| p.into_inner()) = status;
    }

    pub(crate) fn take_pending_indexer(&self) -> Option<http::Uri> {
        self.pending_indexer
            .lock()
            .unwrap_or_else(|p| p.into_inner())
            .clone()
    }

    pub(crate) fn set_pending_indexer(&self, uri: Option<http::Uri>) {
        *self
            .pending_indexer
            .lock()
            .unwrap_or_else(|p| p.into_inner()) = uri;
    }

    /// Publishes each change of a job's progress until the returned handle drops.
    pub(crate) fn watch_progress<S, F>(
        self: &Arc<Self>,
        status: F,
        event: fn(S) -> WalletEvent,
    ) -> AbortOnDrop<()>
    where
        S: PartialEq + Clone + Send + 'static,
        F: Fn() -> Option<S> + Send + 'static,
    {
        let wallet = self.clone();
        runtime::spawn(async move {
            let mut last: Option<S> = None;
            loop {
                tokio::time::sleep(PROGRESS_INTERVAL).await;
                let current = status();
                if current != last {
                    if let Some(snapshot) = current.clone() {
                        wallet.publish(event(snapshot));
                    }
                    last = current;
                }
            }
        })
    }
}

#[uniffi::export(async_runtime = "tokio")]
impl Wallet {
    /// A fresh view of this wallet's events.
    pub fn events(&self) -> Arc<EventStream> {
        EventStream::new(self.events.subscribe())
    }

    /// Pauses a running sync, drops the client, and clears the current-wallet slot.
    pub async fn shutdown(self: Arc<Self>) -> Result<(), ZingoError> {
        if self.is_closed() {
            return Ok(());
        }
        let wallet = self.clone();
        let outcome = runtime::run(async move {
            let mut guard = wallet.client.write().await;
            if let Some(client) = guard.as_ref()
                && client.sync_mode() == pepper_sync::wallet::SyncMode::Running
            {
                let _ = client.pause_sync();
            }
            *guard = None;
            Ok(())
        })
        .await;
        self.stop_watchers();
        registry::unregister(&self);
        outcome
    }

    /// The job that holds the client right now, if any.
    pub fn running_job_kind(&self) -> Option<JobKind> {
        self.running_job()
    }
}

impl std::fmt::Debug for Wallet {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Wallet")
    }
}

impl Drop for Wallet {
    fn drop(&mut self) {
        self.closed.store(true, Ordering::Release);
    }
}
