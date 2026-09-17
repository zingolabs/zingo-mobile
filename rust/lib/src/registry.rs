//! The process-wide slot that lets JavaScript and the native background paths share one wallet.

use std::sync::{Arc, RwLock};

use crate::wallet::Wallet;

static CURRENT: RwLock<Option<Arc<Wallet>>> = RwLock::new(None);

/// The wallet the last `open_*` constructor produced, until `close` clears it.
#[uniffi::export]
pub fn current_wallet() -> Option<Arc<Wallet>> {
    CURRENT
        .read()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone()
}

pub(crate) fn register(wallet: Arc<Wallet>) -> Option<Arc<Wallet>> {
    CURRENT
        .write()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .replace(wallet)
}

pub(crate) fn unregister(wallet: &Arc<Wallet>) {
    let mut slot = CURRENT
        .write()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    if slot
        .as_ref()
        .is_some_and(|current| Arc::ptr_eq(current, wallet))
    {
        *slot = None;
    }
}
