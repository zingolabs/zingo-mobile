//! Reads through the wallet data, and the short mutations that take the client.

use std::collections::HashMap;
use std::num::NonZeroU32;
use std::sync::Arc;

use zcash_keys::keys::UnifiedFullViewingKey;
use zingolib::config::{ChainType, construct_indexer_uri};
use zingolib::netutils::{GrpcIndexer, Indexer};
use zingolib::utils::conversion::{address_from_str, txid_from_hex_encoded_str};
use zingolib::wallet::keys::unified::UnifiedKeyStore;
use zip32::AccountId;

use super::Wallet;
use crate::config;
use crate::error::{LoadError, ZingoError, ffi_error, key_failure, wallet_failure};
use crate::functions::INDEXER_REQUEST_TIMEOUT;
use crate::types::{
    AddressTotals, Balance, Chain, Seed, ServerInfo, ValueTransfer, ViewingKey, WalletKind,
    WalletSettings, WalletVersion,
};

#[uniffi::export(async_runtime = "tokio")]
impl Wallet {
    pub async fn chain(self: Arc<Self>) -> Result<Chain, ZingoError> {
        self.run("chain", move |w| async move {
            Ok(Chain::from(w.data().read().await.chain_type()))
        })
        .await
    }

    /// The wallet's mnemonic phrase with its birthday and chain.
    pub async fn seed(self: Arc<Self>) -> Result<Seed, ZingoError> {
        self.run("seed", move |w| async move {
            let data = w.data().read().await;
            let info = data.recovery_info().ok_or(ZingoError::MnemonicNotFound)?;
            Ok(Seed {
                seed_phrase: info.seed_phrase,
                birthday: u32::try_from(info.birthday).unwrap_or(u32::MAX),
                no_of_accounts: info.no_of_accounts,
                chain: Chain::from(data.chain_type()),
            })
        })
        .await
    }

    /// The wallet's unified full viewing key with its birthday and chain.
    pub async fn viewing_key(self: Arc<Self>) -> Result<ViewingKey, ZingoError> {
        self.run("viewing_key", move |w| async move {
            let data = w.data().read().await;
            let store = data
                .unified_key_store
                .get(&AccountId::ZERO)
                .ok_or_else(|| ZingoError::Internal {
                    detail: "account 0 is missing".to_string(),
                })?;
            let ufvk: UnifiedFullViewingKey = store
                .try_into()
                .map_err(|e: zingolib::wallet::error::KeyError| key_failure(e))?;
            Ok(ViewingKey {
                ufvk: ufvk.encode(&data.chain_type()),
                birthday: u32::from(data.birthday()),
                chain: Chain::from(data.chain_type()),
            })
        })
        .await
    }

    pub async fn wallet_kind(self: Arc<Self>) -> Result<WalletKind, ZingoError> {
        self.run("wallet_kind", move |w| async move {
            let data = w.data().read().await;
            if data.mnemonic_phrase().is_some() {
                return Ok(WalletKind::Seed);
            }
            let store = data
                .unified_key_store
                .get(&AccountId::ZERO)
                .ok_or_else(|| ZingoError::Internal {
                    detail: "account 0 is missing".to_string(),
                })?;
            Ok(match store {
                UnifiedKeyStore::Spend(_) => WalletKind::SpendingKey,
                UnifiedKeyStore::View(ufvk) => WalletKind::ViewingKey {
                    transparent: ufvk.transparent().is_some(),
                    sapling: ufvk.sapling().is_some(),
                    orchard: ufvk.orchard().is_some(),
                },
                UnifiedKeyStore::Empty => WalletKind::NoKeys,
            })
        })
        .await
    }

    pub async fn wallet_version(self: Arc<Self>) -> Result<WalletVersion, ZingoError> {
        self.run("wallet_version", move |w| async move {
            let data = w.data().read().await;
            Ok(WalletVersion {
                current: data.current_version(),
                read: data.read_version(),
            })
        })
        .await
    }

    pub async fn settings(self: Arc<Self>) -> Result<WalletSettings, ZingoError> {
        self.run("settings", move |w| async move {
            let data = w.data().read().await;
            Ok(WalletSettings {
                performance: data.wallet_settings.sync_config.performance_level.into(),
                min_confirmations: data.wallet_settings.min_confirmations.get(),
            })
        })
        .await
    }

    pub async fn set_settings(self: Arc<Self>, settings: WalletSettings) -> Result<(), ZingoError> {
        self.run("set_settings", move |w| async move {
            let min_confirmations = NonZeroU32::try_from(settings.min_confirmations)
                .map_err(|_| ZingoError::input("min_confirmations must be greater than 0"))?;
            let mut data = w.data().write().await;
            data.wallet_settings.min_confirmations = min_confirmations;
            data.wallet_settings.sync_config.performance_level = settings.performance.into();
            data.mark_dirty();
            Ok(())
        })
        .await
    }

    pub async fn is_save_required(self: Arc<Self>) -> Result<bool, ZingoError> {
        self.run("is_save_required", move |w| async move {
            let client = w.client_read().await?;
            Ok(client.is_save_required().await)
        })
        .await
    }

    /// The wallet's bytes when a save is due, or `None` when nothing changed.
    pub async fn save_wallet_bytes(self: Arc<Self>) -> Result<Option<Vec<u8>>, LoadError> {
        self.run("save_wallet_bytes", move |w| async move {
            let mut data = w.data().write().await;
            data.save().map_err(ZingoError::save)
        })
        .await
        .map_err(LoadError::from)
    }

    pub async fn latest_block_wallet(self: Arc<Self>) -> Result<u32, ZingoError> {
        self.run("latest_block_wallet", move |w| async move {
            let data = w.data().read().await;
            Ok(data
                .sync_state
                .last_known_chain_height()
                .map_or(0, u32::from))
        })
        .await
    }

    pub async fn balance(self: Arc<Self>) -> Result<Balance, ZingoError> {
        self.run("balance", move |w| async move {
            let data = w.data().read().await;
            data.account_balance(AccountId::ZERO)
                .map(Balance::from)
                .map_err(ZingoError::internal)
        })
        .await
    }

    /// The confirmed shielded value the wallet can spend right now.
    pub async fn spendable_balance(self: Arc<Self>) -> Result<u64, ZingoError> {
        self.run("spendable_balance", move |w| async move {
            let data = w.data().read().await;
            data.shielded_spendable_balance(AccountId::ZERO, false)
                .map(|z| z.into_u64())
                .map_err(ZingoError::internal)
        })
        .await
    }

    /// The most the wallet can send to `address`, with or without the Zennies output.
    pub async fn spendable_balance_to(
        self: Arc<Self>,
        address: String,
        zennies: bool,
    ) -> Result<u64, ZingoError> {
        self.run("spendable_balance_to", move |w| async move {
            let address = address_from_str(&address)
                .map_err(|_| ZingoError::input("unknown address format"))?;
            let client = w.client_read().await?;
            client
                .max_send_value(address, zennies, AccountId::ZERO)
                .await
                .map(|z| z.into_u64())
                .map_err(|e| ffi_error(zingolib::lightclient::error::SendError::from(e).into()))
        })
        .await
    }

    /// Every value transfer, with each Orchard-to-Ironwood migration carrying the amount it moved.
    pub async fn value_transfers(self: Arc<Self>) -> Result<Vec<ValueTransfer>, ZingoError> {
        self.run("value_transfers", move |w| async move {
            let data = w.data().read().await;
            let migrated_by_txid: HashMap<String, u64> = data
                .transaction_summaries(true)
                .await
                .map_err(ZingoError::internal)?
                .0
                .iter()
                .filter(|s| s.is_orchard_to_ironwood_migration())
                .map(|s| {
                    (
                        s.txid.to_string(),
                        s.ironwood_notes.iter().map(|n| n.value).sum::<u64>(),
                    )
                })
                .collect();
            let transfers = data
                .value_transfers(true)
                .await
                .map_err(ZingoError::internal)?;
            Ok(transfers
                .iter()
                .cloned()
                .map(|vt| {
                    let mut transfer = ValueTransfer::from(vt);
                    if transfer.kind == crate::types::TransferKind::Migration
                        && let Some(migrated) = migrated_by_txid.get(&transfer.txid)
                    {
                        transfer.value = *migrated;
                    }
                    transfer
                })
                .collect())
        })
        .await
    }

    /// The value transfers whose memos mention `address`, newest first.
    pub async fn messages(
        self: Arc<Self>,
        address: String,
    ) -> Result<Vec<ValueTransfer>, ZingoError> {
        self.run("messages", move |w| async move {
            let data = w.data().read().await;
            let transfers = data
                .messages_containing(Some(address.as_str()))
                .await
                .map_err(ZingoError::internal)?;
            Ok(transfers.iter().cloned().map(ValueTransfer::from).collect())
        })
        .await
    }

    pub async fn total_value_to_address(self: Arc<Self>) -> Result<AddressTotals, ZingoError> {
        self.run("total_value_to_address", move |w| async move {
            let data = w.data().read().await;
            let totals = data
                .do_total_value_to_address()
                .await
                .map_err(ZingoError::internal)?;
            Ok(AddressTotals { totals: totals.0 })
        })
        .await
    }

    pub async fn total_spends_to_address(self: Arc<Self>) -> Result<AddressTotals, ZingoError> {
        self.run("total_spends_to_address", move |w| async move {
            let data = w.data().read().await;
            let totals = data
                .do_total_spends_to_address()
                .await
                .map_err(ZingoError::internal)?;
            Ok(AddressTotals { totals: totals.0 })
        })
        .await
    }

    pub async fn total_memobytes_to_address(self: Arc<Self>) -> Result<AddressTotals, ZingoError> {
        self.run("total_memobytes_to_address", move |w| async move {
            let data = w.data().read().await;
            let totals = data
                .do_total_memobytes_to_address()
                .await
                .map_err(ZingoError::internal)?;
            Ok(AddressTotals {
                totals: totals
                    .0
                    .into_iter()
                    .map(|(address, bytes)| (address, bytes as u64))
                    .collect(),
            })
        })
        .await
    }

    /// The current ZEC price in USD from the price race.
    pub async fn zec_price(self: Arc<Self>) -> Result<f32, ZingoError> {
        self.run("zec_price", move |w| async move {
            let client = w.client_read().await?;
            client
                .update_current_price()
                .await
                .map(|fetch| fetch.usd)
                .map_err(ffi_error)
        })
        .await
    }

    /// Removes a failed transaction from the wallet.
    pub async fn remove_transaction(self: Arc<Self>, txid: String) -> Result<(), ZingoError> {
        self.run("remove_transaction", move |w| async move {
            let txid = txid_from_hex_encoded_str(&txid).map_err(ZingoError::invalid_input)?;
            let mut data = w.data().write().await;
            data.remove_failed_transaction(txid).map_err(wallet_failure)
        })
        .await
    }

    /// What the connected server reports about itself, with the wallet's Ironwood activation.
    pub async fn server_info(self: Arc<Self>) -> Result<ServerInfo, ZingoError> {
        self.run("server_info", move |w| async move {
            let (uri, chain) = {
                let client = w.client_read().await?;
                (client.indexer_uri(), client.chain_type())
            };
            let uri = uri.ok_or(ZingoError::Offline)?;
            let mut indexer = GrpcIndexer::new(uri.clone())
                .await
                .map_err(ZingoError::indexer_unreachable)?;
            let info = indexer
                .get_lightd_info(INDEXER_REQUEST_TIMEOUT)
                .await
                .map_err(ZingoError::indexer_request_failed)?;
            Ok(ServerInfo::from_upstream(
                zingolib::data::ServerInfo {
                    version: info.version,
                    git_commit: info.git_commit,
                    server_uri: uri,
                    vendor: info.vendor,
                    taddr_support: info.taddr_support,
                    chain_name: info.chain_name,
                    sapling_activation_height: info.sapling_activation_height,
                    consensus_branch_id: info.consensus_branch_id,
                    latest_block_height: info.block_height,
                },
                config::ironwood_activation_height(chain),
            ))
        })
        .await
    }

    /// Points the wallet at another server, dialing it once before the client is taken.
    pub async fn change_server(
        self: Arc<Self>,
        server_uri: Option<String>,
    ) -> Result<(), ZingoError> {
        self.run("change_server", move |w| async move {
            let chain = w.data().read().await.chain_type();
            let uri = match server_uri.filter(|uri| !uri.is_empty()) {
                Some(uri) => construct_indexer_uri(uri)
                    .map_err(|_| ZingoError::input("invalid server uri"))?,
                None => {
                    let census_chain = match chain {
                        ChainType::Testnet => zingolib::indexers::IndexerChain::Test,
                        ChainType::Mainnet | ChainType::Regtest(_) => {
                            zingolib::indexers::IndexerChain::Main
                        }
                    };
                    let default = zingolib::indexers::active(census_chain)
                        .next()
                        .map(|indexer| indexer.uri.to_string())
                        .ok_or_else(|| ZingoError::input("empty indexer census"))?;
                    construct_indexer_uri(default)
                        .map_err(|_| ZingoError::input("invalid server uri"))?
                }
            };
            GrpcIndexer::new(uri.clone())
                .await
                .map_err(ZingoError::indexer_unreachable)?;
            let mut client = w.client_write().await?;
            client
                .set_indexer_uri(uri)
                .await
                .map_err(|e| ffi_error(e.into()))?;
            drop(client);
            w.set_pending_indexer(None);
            Ok(())
        })
        .await
    }
}
