//! The wallet's addresses.

use std::sync::Arc;

use pepper_sync::keys::transparent;
use pepper_sync::wallet::KeyIdInterface;
use zingolib::wallet::keys::unified::ReceiverSelection;
use zip32::AccountId;

use super::Wallet;
use crate::error::{ZingoError, key_failure};
use crate::types::{TransparentAddress, UnifiedAddress, UnifiedReceivers, WalletAddress};

#[uniffi::export(async_runtime = "tokio")]
impl Wallet {
    pub async fn unified_addresses(self: Arc<Self>) -> Result<Vec<UnifiedAddress>, ZingoError> {
        self.run("unified_addresses", move |w| async move {
            let data = w.data().read().await;
            let chain = data.chain_type();
            Ok(data
                .unified_addresses()
                .iter()
                .map(|(id, address)| UnifiedAddress {
                    account: u32::from(id.account_id),
                    address_index: id.address_index,
                    has_orchard: address.has_orchard(),
                    has_sapling: address.has_sapling(),
                    has_transparent: address.has_transparent(),
                    encoded_address: address.encode(&chain),
                })
                .collect())
        })
        .await
    }

    pub async fn transparent_addresses(
        self: Arc<Self>,
    ) -> Result<Vec<TransparentAddress>, ZingoError> {
        self.run("transparent_addresses", move |w| async move {
            let data = w.data().read().await;
            Ok(data
                .transparent_addresses()
                .iter()
                .map(|(id, address)| TransparentAddress {
                    account: u32::from(id.account_id()),
                    address_index: id.address_index().index(),
                    scope: id.scope().into(),
                    encoded_address: address.clone(),
                })
                .collect())
        })
        .await
    }

    /// Derives the next unified address with the chosen shielded receivers.
    pub async fn new_unified_address(
        self: Arc<Self>,
        receivers: UnifiedReceivers,
    ) -> Result<UnifiedAddress, ZingoError> {
        self.run("new_unified_address", move |w| async move {
            let mut data = w.data().write().await;
            let chain = data.chain_type();
            let selection = ReceiverSelection {
                orchard: receivers.orchard,
                sapling: receivers.sapling,
            };
            let (id, address) = data
                .generate_unified_address(selection, AccountId::ZERO)
                .map_err(key_failure)?;
            Ok(UnifiedAddress {
                account: u32::from(AccountId::ZERO),
                address_index: id.address_index,
                has_orchard: address.has_orchard(),
                has_sapling: address.has_sapling(),
                has_transparent: address.has_transparent(),
                encoded_address: address.encode(&chain),
            })
        })
        .await
    }

    /// Derives the next transparent address, refusing while the latest one is unused.
    pub async fn new_transparent_address(
        self: Arc<Self>,
    ) -> Result<TransparentAddress, ZingoError> {
        self.run("new_transparent_address", move |w| async move {
            let mut data = w.data().write().await;
            let chain = data.chain_type();
            let (id, address) = data
                .generate_transparent_address(AccountId::ZERO, true)
                .map_err(key_failure)?;
            Ok(TransparentAddress {
                account: u32::from(id.account_id()),
                address_index: id.address_index().index(),
                scope: id.scope().into(),
                encoded_address: transparent::encode_address(&chain, address),
            })
        })
        .await
    }

    /// Where `address` sits in this wallet's key tree, or `None` for an external address.
    pub async fn check_address(
        self: Arc<Self>,
        address: String,
    ) -> Result<Option<WalletAddress>, ZingoError> {
        self.run("check_address", move |w| async move {
            let data = w.data().read().await;
            data.is_address_derived_by_keys(&address)
                .map(|found| found.map(WalletAddress::from))
                .map_err(key_failure)
        })
        .await
    }
}
