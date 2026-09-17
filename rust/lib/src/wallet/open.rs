//! The four ways a wallet opens.

use std::num::NonZeroU32;
use std::sync::Arc;

use zingolib::config::{ChainType, WalletConfig, lib_birthday};
use zingolib::lightclient::LightClient;
use zingolib::lightclient::error::LightClientError;
use zingolib::netutils::{GrpcIndexer, Indexer};

use super::Wallet;
use crate::config::{self, ConnectionParams};
use crate::error::{LoadError, ZingoError, ffi_error, open_error};
use crate::functions::INDEXER_REQUEST_TIMEOUT;
use crate::runtime;
use crate::types::{Chain, Connection};

fn one_account() -> NonZeroU32 {
    NonZeroU32::MIN
}

async fn open_with(
    op: &'static str,
    connection: Connection,
    make_wallet_config: impl FnOnce(&ConnectionParams) -> WalletConfig + Send + 'static,
) -> Result<Arc<Wallet>, ZingoError> {
    let outcome = runtime::run(async move {
        let params = config::connection_params(&connection)?;
        let wallet_config = make_wallet_config(&params);
        let client_config = config::client_config(&params, wallet_config)?;
        let client = LightClient::new(client_config, false)
            .await
            .map_err(ffi_error)?;
        Ok(Wallet::attach(client, None))
    })
    .await;
    if let Err(error) = &outcome {
        log::error!(target: "zingo::ffi", op = op, tag = error.tag(); "{error}");
    }
    outcome
}

async fn chain_tip(uri: http::Uri) -> Result<u32, ZingoError> {
    let mut indexer = GrpcIndexer::new(uri)
        .await
        .map_err(ZingoError::indexer_unreachable)?;
    let block = indexer
        .get_latest_block(INDEXER_REQUEST_TIMEOUT)
        .await
        .map_err(ZingoError::indexer_request_failed)?;
    Ok(u32::try_from(block.height).unwrap_or(u32::MAX))
}

#[uniffi::export]
impl Wallet {
    /// A wallet with a fresh seed, born at the chain tip online or at `birthday` offline.
    #[uniffi::constructor]
    pub async fn open_new(connection: Connection, birthday: u32) -> Result<Arc<Self>, ZingoError> {
        let outcome = runtime::run(async move {
            let params = config::connection_params(&connection)?;
            let chain_height = match params.indexer_uri.clone() {
                Some(uri) => chain_tip(uri).await?,
                None if birthday > 0 => birthday,
                None => lib_birthday(params.chain_type),
            };
            let wallet_config = WalletConfig::NewSeed {
                no_of_accounts: one_account(),
                chain_height,
                wallet_settings: params.wallet_settings.clone(),
            };
            let client_config = config::client_config(&params, wallet_config)?;
            let client = LightClient::new(client_config, false)
                .await
                .map_err(ffi_error)?;
            Ok(Wallet::attach(client, None))
        })
        .await;
        if let Err(error) = &outcome {
            log::error!(target: "zingo::ffi", op = "open_new", tag = error.tag(); "{error}");
        }
        outcome
    }

    /// A wallet restored from a mnemonic phrase.
    #[uniffi::constructor]
    pub async fn open_from_seed(
        connection: Connection,
        seed_phrase: String,
        birthday: u32,
    ) -> Result<Arc<Self>, ZingoError> {
        open_with("open_from_seed", connection, move |params| {
            WalletConfig::MnemonicPhrase {
                mnemonic_phrase: seed_phrase,
                no_of_accounts: one_account(),
                birthday,
                wallet_settings: params.wallet_settings.clone(),
            }
        })
        .await
    }

    /// A watch-only wallet restored from a unified full viewing key.
    #[uniffi::constructor]
    pub async fn open_from_ufvk(
        connection: Connection,
        ufvk: String,
        birthday: u32,
    ) -> Result<Arc<Self>, ZingoError> {
        open_with("open_from_ufvk", connection, move |params| {
            WalletConfig::Ufvk {
                ufvk,
                birthday,
                wallet_settings: params.wallet_settings.clone(),
            }
        })
        .await
    }

    /// A wallet read from its saved bytes, on the connection's chain online
    /// or on whichever chain the bytes deserialize under offline.
    #[uniffi::constructor]
    pub async fn open_from_bytes(
        connection: Connection,
        wallet_bytes: Vec<u8>,
    ) -> Result<Arc<Self>, LoadError> {
        let outcome = runtime::run(async move { open_bytes(connection, wallet_bytes).await }).await;
        if let Err(error) = &outcome {
            log::error!(target: "zingo::ffi", op = "open_from_bytes", tag = error.tag(); "{error}");
        }
        outcome.map_err(LoadError::from)
    }
}

async fn open_bytes(
    connection: Connection,
    wallet_bytes: Vec<u8>,
) -> Result<Arc<Wallet>, ZingoError> {
    let offline = connection.server_uri.as_deref().is_none_or(str::is_empty);
    let chains: Vec<Chain> = if offline {
        vec![Chain::Main, Chain::Test, Chain::Regtest]
    } else {
        vec![connection.chain]
    };
    let mut last_error = ZingoError::WalletUnreadable {
        detail: "could not read the wallet with any chain".to_string(),
    };
    for chain in chains {
        let attempt = Connection {
            chain,
            ..connection.clone()
        };
        let params = match config::connection_params(&attempt) {
            Ok(params) => params,
            Err(e) => {
                last_error = e;
                continue;
            }
        };
        match read_client(&params, &wallet_bytes).await {
            Ok(client) => return finish(client, &params, None).await,
            Err(LightClientError::ClientError(_)) if params.indexer_uri.is_some() => {
                let mut offline_params = params;
                let pending = offline_params.indexer_uri.take();
                match read_client(&offline_params, &wallet_bytes).await {
                    Ok(client) => return finish(client, &offline_params, pending).await,
                    Err(e) => last_error = open_error(e),
                }
            }
            Err(e) => last_error = open_error(e),
        }
    }
    Err(last_error)
}

async fn read_client(
    params: &ConnectionParams,
    wallet_bytes: &[u8],
) -> Result<LightClient, LightClientError> {
    let client_config = config::client_config(params, WalletConfig::Read)
        .map_err(|e| LightClientError::FileError(std::io::Error::other(e.to_string())))?;
    LightClient::from_bytes(wallet_bytes.to_vec(), client_config).await
}

async fn finish(
    client: LightClient,
    params: &ConnectionParams,
    pending: Option<http::Uri>,
) -> Result<Arc<Wallet>, ZingoError> {
    {
        let mut data = client.wallet().write().await;
        data.wallet_settings = params.wallet_settings.clone();
    }
    let _ = ChainType::Mainnet;
    Ok(Wallet::attach(client, pending))
}
