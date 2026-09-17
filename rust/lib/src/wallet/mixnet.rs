//! Mixnet Mode: attaching the host's proxy, the exec fallback, and the status stream.

use std::sync::Arc;

use super::Wallet;
use crate::error::ZingoError;
use crate::runtime::{self, AbortOnDrop};
use crate::types::{MixnetStatus, WalletEvent};

#[uniffi::export(async_runtime = "tokio")]
impl Wallet {
    /// Attaches Mixnet Mode to the host-run SOCKS5 endpoint that bound `exit_node`.
    pub async fn attach_mixnet(
        self: Arc<Self>,
        socks5_addr: String,
        exit_node: String,
    ) -> Result<MixnetStatus, ZingoError> {
        self.run("attach_mixnet", move |w| async move {
            let exit = zingolib::mixnet::ExitNodeId::parse(&exit_node)
                .map_err(|_| ZingoError::input("the shim reported no exit node"))?;
            let mut client = w.client_write().await?;
            client
                .attach_mixnet(&socks5_addr, &[exit])
                .await
                .map_err(ZingoError::mixnet_enable_failed)?;
            drop(client);
            Ok(MixnetStatus::from_upstream(&w.mixnet().borrow()))
        })
        .await
    }

    /// Enables Mixnet Mode by spawning the bundled proxy binary at `proxy_path`.
    pub async fn enable_mixnet(
        self: Arc<Self>,
        proxy_path: String,
    ) -> Result<MixnetStatus, ZingoError> {
        self.run("enable_mixnet", move |w| async move {
            let mut client = w.client_write().await?;
            client
                .enable_mixnet(std::path::Path::new(&proxy_path))
                .await
                .map_err(ZingoError::mixnet_enable_failed)?;
            drop(client);
            Ok(MixnetStatus::from_upstream(&w.mixnet().borrow()))
        })
        .await
    }

    /// Switches Mixnet Mode off: the user's per-session consent to clearnet.
    pub async fn disable_mixnet(self: Arc<Self>) -> Result<(), ZingoError> {
        self.run("disable_mixnet", move |w| async move {
            let mut client = w.client_write().await?;
            client.disable_mixnet().await;
            Ok(())
        })
        .await
    }

    /// The latest mixnet status, read from the channel subscribed at open.
    pub async fn mixnet_status(self: Arc<Self>) -> Result<MixnetStatus, ZingoError> {
        self.run("mixnet_status", move |w| async move {
            Ok(MixnetStatus::from_upstream(&w.mixnet().borrow()))
        })
        .await
    }
}

/// Forwards every change of the mixnet status as a `MixnetMode` event.
pub(crate) fn spawn_mixnet_watcher(wallet: &Arc<Wallet>) -> AbortOnDrop<()> {
    let wallet = wallet.clone();
    runtime::spawn(async move {
        let mut receiver = wallet.mixnet();
        while receiver.changed().await.is_ok() {
            if wallet.is_closed() {
                return;
            }
            let status = MixnetStatus::from_upstream(&receiver.borrow_and_update());
            wallet.publish(WalletEvent::MixnetMode { status });
        }
    })
}
