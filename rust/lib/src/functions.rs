//! The exports that need no open wallet.

use std::time::Duration;

use rustls::crypto::{CryptoProvider, ring::default_provider};
use zcash_address::unified::{Container, Encoding, Fvk, Ufvk};
use zcash_keys::address::{Address, UnifiedAddress as UnifiedAddressKeys};
use zcash_protocol::consensus::NetworkType;
use zingo_common_components::protocol::ActivationHeights;
use zingolib::config::{ChainType, construct_indexer_uri};
use zingolib::netutils::{GrpcIndexer, Indexer};

use crate::config;
use crate::error::{LoadError, ZingoError};
use crate::runtime;
use crate::types::{Chain, ParsedAddress, ParsedViewingKey, Pool, RecoveryInfo};

pub(crate) const INDEXER_REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// The build descriptor: the zingolib tag and the zingo-mobile part.
#[uniffi::export]
pub fn version() -> String {
    format!(
        "{}-{}",
        zingolib::git_description(),
        crate::zm_description()
    )
}

#[uniffi::export]
pub fn developer_donation_address() -> String {
    zingolib::DEVELOPER_DONATION_ADDRESS.to_string()
}

#[uniffi::export]
pub fn zennies_donation_address() -> String {
    zingolib::ZENNIES_FOR_ZINGO_DONATION_ADDRESS.to_string()
}

/// Installs the ring crypto provider once per process.
#[uniffi::export]
pub fn install_crypto_provider() -> Result<(), ZingoError> {
    if CryptoProvider::get_default().is_some() {
        return Ok(());
    }
    default_provider()
        .install_default()
        .map_err(|_| ZingoError::Internal {
            detail: "failed to install the ring crypto provider".to_string(),
        })
}

/// Names one dedicated migration-transmission endpoint for the next open, or clears it.
#[uniffi::export]
pub fn set_migration_transmission_uri(uri: Option<String>) -> Result<(), ZingoError> {
    let parsed = match uri.filter(|u| !u.is_empty()) {
        Some(uri) => Some(
            construct_indexer_uri(uri.clone())
                .map_err(|e| ZingoError::input(format!("invalid transmission uri {uri}: {e}")))?,
        ),
        None => None,
    };
    config::set_migration_transmission_uri(parsed);
    Ok(())
}

/// The chain tip height a server reports.
#[uniffi::export(async_runtime = "tokio")]
pub async fn server_latest_block(server_uri: String) -> Result<u32, ZingoError> {
    runtime::run(async move {
        let uri: http::Uri = server_uri
            .parse()
            .map_err(|e| ZingoError::input(format!("failed to parse uri: {e}")))?;
        let mut indexer = GrpcIndexer::new(uri)
            .await
            .map_err(ZingoError::indexer_unreachable)?;
        let block = indexer
            .get_latest_block(INDEXER_REQUEST_TIMEOUT)
            .await
            .map_err(ZingoError::indexer_request_failed)?;
        Ok(u32::try_from(block.height).unwrap_or(u32::MAX))
    })
    .await
}

fn chains() -> [ChainType; 3] {
    [
        ChainType::Mainnet,
        ChainType::Testnet,
        ChainType::Regtest(ActivationHeights::default()),
    ]
}

/// Decodes an address on whichever chain accepts it.
#[uniffi::export]
pub fn parse_address(address: String) -> Result<ParsedAddress, ZingoError> {
    if address.is_empty() {
        return Err(ZingoError::input("the address is empty"));
    }
    let decoded = chains()
        .iter()
        .find_map(|chain| Address::decode(chain, &address).zip(Some(*chain)));
    let Some((decoded, chain_type)) = decoded else {
        return Ok(ParsedAddress::Invalid);
    };
    let chain = Chain::from(chain_type);
    Ok(match decoded {
        Address::Sapling(_) => ParsedAddress::Sapling { chain },
        Address::Transparent(_) => ParsedAddress::Transparent { chain },
        Address::Tex(_) => ParsedAddress::Tex { chain },
        Address::Unified(ua) => {
            let mut receivers = Vec::new();
            if ua.sapling().is_some() {
                receivers.push(Pool::Sapling);
            }
            if ua.transparent().is_some() {
                receivers.push(Pool::Transparent);
            }
            let shielded_only = ua.orchard().and_then(|orchard| {
                receivers.push(Pool::Orchard);
                UnifiedAddressKeys::from_receivers(Some(*orchard), None, None)
                    .map(|only| only.encode(&chain_type))
            });
            ParsedAddress::Unified {
                chain,
                receivers,
                shielded_only,
            }
        }
    })
}

/// Decodes a unified full viewing key and names the pools it can view.
#[uniffi::export]
pub fn parse_viewing_key(ufvk: String) -> Result<ParsedViewingKey, ZingoError> {
    if ufvk.is_empty() {
        return Err(ZingoError::input("the ufvk is empty"));
    }
    let Ok((network, key)) = Ufvk::decode(&ufvk) else {
        return Ok(ParsedViewingKey::Invalid);
    };
    let mut pools = Vec::new();
    let mut has_unknown_items = false;
    for item in key.items_as_parsed() {
        match item {
            Fvk::Orchard(_) => pools.push(Pool::Orchard),
            Fvk::Sapling(_) => pools.push(Pool::Sapling),
            Fvk::P2pkh(_) => pools.push(Pool::Transparent),
            Fvk::Unknown { .. } => has_unknown_items = true,
        }
    }
    Ok(ParsedViewingKey::Unified {
        chain: match network {
            NetworkType::Main => Chain::Main,
            NetworkType::Test => Chain::Test,
            NetworkType::Regtest => Chain::Regtest,
        },
        pools,
        has_unknown_items,
    })
}

/// Salvages the seed phrase, birthday, and account count from the stable
/// prefix of a wallet file that cannot open.
#[uniffi::export]
pub fn wallet_recovery_info(wallet_bytes: Vec<u8>) -> Result<RecoveryInfo, LoadError> {
    zingolib::wallet::LightWallet::read_recovery_info(wallet_bytes.as_slice())
        .map(RecoveryInfo::from)
        .map_err(|e| LoadError::Unreadable {
            detail: e.to_string(),
        })
}

/// Confirms the bytes parse as a complete wallet under one of the supported
/// chains, reporting the failure whose parse reached the deepest byte.
#[uniffi::export]
pub fn validate_wallet_bytes(wallet_bytes: Vec<u8>) -> Result<(), LoadError> {
    let mut deepest = (0usize, String::from("empty wallet bytes"));
    for chain in chains() {
        let mut remaining = wallet_bytes.as_slice();
        match zingolib::wallet::LightWallet::validate(&mut remaining, chain) {
            Ok(()) => return Ok(()),
            Err(e) => {
                let consumed = wallet_bytes.len() - remaining.len();
                if consumed >= deepest.0 {
                    deepest = (consumed, e.to_string());
                }
            }
        }
    }
    Err(LoadError::Unreadable { detail: deepest.1 })
}

/// The salvage contract: a wallet file cut anywhere past its stable prefix
/// still yields the seed and birthday, and unreadable bytes fail typed.
#[cfg(test)]
mod wallet_salvage_tests {
    use super::*;

    fn stable_prefix() -> Vec<u8> {
        let mut bytes = 42u64.to_le_bytes().to_vec();
        bytes.push(0);
        bytes.push(32);
        bytes.extend([7u8; 32]);
        bytes.extend(2_000_000u32.to_le_bytes());
        bytes.push(1);
        bytes
    }

    #[test]
    fn a_truncated_wallet_salvages_seed_and_birthday() {
        let salvaged = wallet_recovery_info(stable_prefix()).unwrap();
        assert_eq!(salvaged.birthday, 2_000_000);
        assert_eq!(salvaged.no_of_accounts, 1);
        assert_eq!(salvaged.seed_phrase.split(' ').count(), 24);
    }

    #[test]
    fn the_cut_point_past_the_prefix_does_not_matter() {
        let mut bytes = stable_prefix();
        bytes.extend([0xAB; 100]);
        assert_eq!(
            wallet_recovery_info(bytes).unwrap(),
            wallet_recovery_info(stable_prefix()).unwrap()
        );
    }

    #[test]
    fn garbage_fails_typed() {
        for garbage in [vec![0x20; 47], vec![0x28; 40]] {
            assert!(matches!(
                wallet_recovery_info(garbage),
                Err(LoadError::Unreadable { .. })
            ));
        }
    }

    #[test]
    fn bytes_that_pass_the_header_heuristic_still_fail_validation() {
        let mut bytes = 42u64.to_le_bytes().to_vec();
        bytes.extend([0x07; 400]);
        assert!(matches!(
            validate_wallet_bytes(bytes),
            Err(LoadError::Unreadable { .. })
        ));
    }
}

/// Tests that address and viewing key parsing names the chain and the
/// receivers, and that an undecodable input is `Invalid` rather than an error.
#[cfg(test)]
mod parse_tests {
    use super::*;

    #[test]
    fn the_donation_address_parses_as_a_mainnet_unified_address() {
        let parsed = parse_address(developer_donation_address()).unwrap();
        assert!(
            matches!(
                parsed,
                ParsedAddress::Unified {
                    chain: Chain::Main,
                    ..
                }
            ),
            "{parsed:?}"
        );
    }

    #[test]
    fn garbage_is_invalid_and_empty_is_an_input_error() {
        assert_eq!(
            parse_address("nope".to_string()).unwrap(),
            ParsedAddress::Invalid
        );
        assert!(matches!(
            parse_address(String::new()),
            Err(ZingoError::InvalidInput { .. })
        ));
        assert_eq!(
            parse_viewing_key("nope".to_string()).unwrap(),
            ParsedViewingKey::Invalid
        );
    }
}
