//! The client configuration a `Connection` resolves to.

use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::RwLock;

use once_cell::sync::Lazy;
use pepper_sync::config::{SyncConfig, TransparentAddressDiscovery};
use zcash_protocol::consensus::{NetworkUpgrade, Parameters};
use zingo_common_components::protocol::ActivationHeights;
use zingolib::config::{ChainType, ClientConfig, WalletConfig, construct_indexer_uri};
use zingolib::wallet::WalletSettings;

use crate::error::ZingoError;
use crate::types::{Chain, Connection};

/// An optional dedicated migration-transmission endpoint, read at every client construction.
static MIGRATION_TRANSMISSION_URI: Lazy<RwLock<Option<http::Uri>>> =
    Lazy::new(|| RwLock::new(None));

pub(crate) fn set_migration_transmission_uri(uri: Option<http::Uri>) {
    *MIGRATION_TRANSMISSION_URI
        .write()
        .unwrap_or_else(|poisoned| poisoned.into_inner()) = uri;
}

pub(crate) struct ConnectionParams {
    pub(crate) chain_type: ChainType,
    pub(crate) wallet_settings: WalletSettings,
    /// `None` in Offline mode, where the client stays Indexerless.
    pub(crate) indexer_uri: Option<http::Uri>,
}

/// Parses the schedule of a regtest chain into activation heights.
///
/// The format is the harness convention: comma-separated `key=height`
/// entries applied left to right over the bare-"regtest" default schedule,
/// where `height` is a block height or `off`, and `all` sets every upgrade
/// through NU6.3 at once.
pub(crate) fn parse_regtest_activation_heights(spec: &str) -> Result<ActivationHeights, String> {
    let default = ActivationHeights::default();
    let mut overwinter = default.overwinter();
    let mut sapling = default.sapling();
    let mut blossom = default.blossom();
    let mut heartwood = default.heartwood();
    let mut canopy = default.canopy();
    let mut nu5 = default.nu5();
    let mut nu6 = default.nu6();
    let mut nu6_1 = default.nu6_1();
    let mut nu6_2 = default.nu6_2();
    let mut nu6_3 = default.nu6_3();
    let mut nu7 = default.nu7();

    for entry in spec.split(',') {
        let entry = entry.trim();
        if entry.is_empty() {
            continue;
        }
        let (key, value) = entry
            .split_once('=')
            .ok_or_else(|| format!("expected key=height, got \"{entry}\""))?;
        let height = match value.trim() {
            "off" => None,
            v => Some(
                v.parse::<u32>()
                    .map_err(|_| format!("invalid height \"{v}\" for \"{}\"", key.trim()))?,
            ),
        };
        match key.trim() {
            "all" => {
                overwinter = height;
                sapling = height;
                blossom = height;
                heartwood = height;
                canopy = height;
                nu5 = height;
                nu6 = height;
                nu6_1 = height;
                nu6_2 = height;
                nu6_3 = height;
            }
            "overwinter" => overwinter = height,
            "sapling" => sapling = height,
            "blossom" => blossom = height,
            "heartwood" => heartwood = height,
            "canopy" => canopy = height,
            "nu5" => nu5 = height,
            "nu6" => nu6 = height,
            "nu6_1" => nu6_1 = height,
            "nu6_2" => nu6_2 = height,
            "nu6_3" => nu6_3 = height,
            "nu7" => nu7 = height,
            other => return Err(format!("unknown network upgrade \"{other}\"")),
        }
    }

    Ok(ActivationHeights::builder()
        .set_overwinter(overwinter)
        .set_sapling(sapling)
        .set_blossom(blossom)
        .set_heartwood(heartwood)
        .set_canopy(canopy)
        .set_nu5(nu5)
        .set_nu6(nu6)
        .set_nu6_1(nu6_1)
        .set_nu6_2(nu6_2)
        .set_nu6_3(nu6_3)
        .set_nu7(nu7)
        .build())
}

pub(crate) fn chain_type(
    chain: Chain,
    regtest_schedule: Option<&str>,
) -> Result<ChainType, ZingoError> {
    Ok(match chain {
        Chain::Main => ChainType::Mainnet,
        Chain::Test => ChainType::Testnet,
        Chain::Regtest => match regtest_schedule {
            Some(schedule) => {
                ChainType::Regtest(parse_regtest_activation_heights(schedule).map_err(|e| {
                    ZingoError::input(format!("invalid regtest activation heights: {e}"))
                })?)
            }
            None => ChainType::Regtest(ActivationHeights::default()),
        },
    })
}

pub(crate) fn wallet_settings(connection: &Connection) -> Result<WalletSettings, ZingoError> {
    Ok(WalletSettings {
        sync_config: SyncConfig {
            transparent_address_discovery: TransparentAddressDiscovery::minimal(),
            performance_level: connection.performance.into(),
        },
        min_confirmations: NonZeroU32::try_from(connection.min_confirmations)
            .map_err(|_| ZingoError::input("min_confirmations must be greater than 0"))?,
    })
}

pub(crate) fn connection_params(connection: &Connection) -> Result<ConnectionParams, ZingoError> {
    let indexer_uri = match connection
        .server_uri
        .as_deref()
        .filter(|uri| !uri.is_empty())
    {
        Some(uri) => Some(
            construct_indexer_uri(uri.to_string())
                .map_err(|e| ZingoError::input(format!("invalid lightwalletd uri: {e}")))?,
        ),
        None => None,
    };
    Ok(ConnectionParams {
        chain_type: chain_type(connection.chain, connection.regtest_schedule.as_deref())?,
        wallet_settings: wallet_settings(connection)?,
        indexer_uri,
    })
}

pub(crate) fn client_config(
    params: &ConnectionParams,
    wallet_config: WalletConfig,
) -> Result<ClientConfig, ZingoError> {
    let builder = ClientConfig::builder()
        .set_chain_type(params.chain_type)
        .set_wallet_dir(PathBuf::new())
        .set_wallet_config(wallet_config);
    let builder = match params.indexer_uri.clone() {
        Some(uri) => builder.set_indexer_uri(uri),
        None => builder,
    };
    let migration_uri = MIGRATION_TRANSMISSION_URI
        .read()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone();
    let builder = match migration_uri {
        Some(uri) => builder.set_migration_transmission_uri(uri),
        None => builder,
    };
    builder.build().map_err(ZingoError::internal)
}

/// Ironwood (NU6.3) activation height for `chain`, from the consensus parameters.
pub(crate) fn ironwood_activation_height(chain: ChainType) -> Option<u32> {
    chain
        .activation_height(NetworkUpgrade::Nu6_3)
        .map(u32::from)
}

/// The regtest schedule handoff: a schedule must carry the launched node's
/// activation heights into the wallet verbatim, and a malformed schedule
/// must fail at parse time.
#[cfg(test)]
mod regtest_activation_heights_tests {
    use super::*;
    use crate::types::PerformanceLevel;

    #[test]
    fn empty_schedule_matches_the_bare_regtest_default() {
        let parsed = parse_regtest_activation_heights("").expect("empty schedule is valid");
        assert_eq!(parsed, ActivationHeights::default());
    }

    #[test]
    fn fixture_schedule_parses_to_the_mixed_chain() {
        let parsed =
            parse_regtest_activation_heights("all=1,nu5=2,nu6=2,nu6_1=5,nu6_2=5,nu6_3=5,nu7=off")
                .expect("the fixture schedule is valid");
        assert_eq!(parsed.canopy(), Some(1));
        assert_eq!(parsed.nu5(), Some(2));
        assert_eq!(parsed.nu6(), Some(2));
        assert_eq!(parsed.nu6_1(), Some(5));
        assert_eq!(parsed.nu6_2(), Some(5));
        assert_eq!(parsed.nu6_3(), Some(5));
        assert_eq!(parsed.nu7(), None);
    }

    #[test]
    fn entries_apply_left_to_right_over_all() {
        let parsed = parse_regtest_activation_heights("all=3,nu6_3=7").expect("override is valid");
        assert_eq!(parsed.nu6(), Some(3));
        assert_eq!(parsed.nu6_3(), Some(7));
    }

    #[test]
    fn unknown_upgrade_is_an_error_not_a_silent_drop() {
        let error = parse_regtest_activation_heights("nu99=1")
            .expect_err("an unknown upgrade must be rejected");
        assert!(error.contains("nu99"), "error names the bad key: {error}");
    }

    #[test]
    fn malformed_height_is_an_error() {
        let error = parse_regtest_activation_heights("nu5=soon")
            .expect_err("a non-numeric height must be rejected");
        assert!(error.contains("soon"), "error names the bad value: {error}");
    }

    /// Tests that a zero minimum confirmation count is refused as invalid input.
    #[test]
    fn zero_min_confirmations_is_invalid_input() {
        let error = connection_params(&Connection {
            server_uri: None,
            chain: Chain::Main,
            regtest_schedule: None,
            performance: PerformanceLevel::Medium,
            min_confirmations: 0,
        })
        .err()
        .expect("zero confirmations must be rejected");
        assert!(matches!(error, ZingoError::InvalidInput { .. }), "{error}");
    }

    /// Tests that an unparseable server uri is refused as invalid input before any dial.
    #[test]
    fn an_invalid_server_uri_is_invalid_input() {
        let error = connection_params(&Connection {
            server_uri: Some("http://an invalid uri with spaces".to_string()),
            chain: Chain::Main,
            regtest_schedule: None,
            performance: PerformanceLevel::Medium,
            min_confirmations: 1,
        })
        .err()
        .expect("an invalid uri must be rejected");
        assert!(matches!(error, ZingoError::InvalidInput { .. }), "{error}");
    }
}
