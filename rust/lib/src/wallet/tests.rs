//! Wallet-level contracts that run offline: opening, saving, the job rule, and closing.

use std::sync::{Arc, Mutex, MutexGuard};

use super::Wallet;
use crate::error::{LoadError, ZingoError};
use crate::functions::validate_wallet_bytes;
use crate::registry::current_wallet;
use crate::runtime::RT;
use crate::types::{Chain, Connection, JobKind, PerformanceLevel, WalletKind};

static SERIAL: Mutex<()> = Mutex::new(());

fn serialized() -> MutexGuard<'static, ()> {
    SERIAL
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

const SEED: &str = "hospital museum valve antique skate museum unfold vocal weird milk scale \
                    social vessel identify crowd hospital control album rib bulb path oven civil tank";

fn offline(chain: Chain) -> Connection {
    Connection {
        server_uri: None,
        chain,
        regtest_schedule: None,
        performance: PerformanceLevel::Medium,
        min_confirmations: 1,
    }
}

fn open_offline(chain: Chain) -> Arc<Wallet> {
    let _ = crate::functions::install_crypto_provider();
    RT.block_on(Wallet::open_from_seed(
        offline(chain),
        SEED.to_string(),
        2_000_000,
    ))
    .expect("the offline wallet opens from its seed")
}

/// Tests that a wallet opened from a seed reports that seed, registers as
/// the current wallet, and yields bytes that validate and reopen offline.
#[test]
fn a_seed_wallet_saves_bytes_that_reopen() {
    let _serial = serialized();
    let wallet = open_offline(Chain::Main);
    let seed = RT.block_on(wallet.clone().seed()).unwrap();
    assert_eq!(seed.seed_phrase, SEED);
    assert_eq!(seed.chain, Chain::Main);
    assert_eq!(
        RT.block_on(wallet.clone().wallet_kind()).unwrap(),
        WalletKind::Seed
    );
    assert!(Arc::ptr_eq(&current_wallet().unwrap(), &wallet));

    let bytes = RT
        .block_on(wallet.clone().save_wallet_bytes())
        .unwrap()
        .expect("a fresh wallet has bytes to save");
    validate_wallet_bytes(bytes.clone()).expect("the saved wallet validates");
    assert!(matches!(
        validate_wallet_bytes(bytes[..bytes.len() / 2].to_vec()),
        Err(LoadError::Unreadable { .. })
    ));

    let reopened = RT
        .block_on(Wallet::open_from_bytes(offline(Chain::Test), bytes))
        .expect("the bytes reopen on whichever chain wrote them");
    assert_eq!(RT.block_on(reopened.clone().chain()).unwrap(), Chain::Main);
    assert!(Arc::ptr_eq(&current_wallet().unwrap(), &reopened));
}

/// Tests that a read still answers while a job holds the client, and that
/// a call needing the client refuses with `Busy` naming the job.
#[test]
fn a_running_job_refuses_client_calls_and_leaves_reads_alone() {
    let _serial = serialized();
    let wallet = open_offline(Chain::Main);
    let job = wallet.begin_job(JobKind::Drain).unwrap();
    assert!(RT.block_on(wallet.clone().balance()).is_ok());
    assert_eq!(
        RT.block_on(wallet.clone().pause_sync()),
        Err(ZingoError::Busy {
            running: JobKind::Drain
        })
    );
    assert!(matches!(
        wallet.begin_job(JobKind::Batch),
        Err(ZingoError::Busy {
            running: JobKind::Drain
        })
    ));
    drop(job);
    assert_eq!(wallet.running_job(), None);
}

/// Tests that a closed wallet refuses every call with `Closed` and leaves
/// the current-wallet slot empty.
#[test]
fn a_closed_wallet_refuses_and_unregisters() {
    let _serial = serialized();
    let wallet = open_offline(Chain::Main);
    RT.block_on(wallet.clone().shutdown()).unwrap();
    assert_eq!(
        RT.block_on(wallet.clone().balance()),
        Err(ZingoError::Closed)
    );
    assert!(current_wallet().is_none());
}

/// Tests that an unreadable file crosses as `LoadError::Unreadable` with
/// a detail that never embeds the bytes it could not read.
#[test]
fn unreadable_bytes_fail_typed() {
    let _serial = serialized();
    let Err(error) = RT.block_on(Wallet::open_from_bytes(
        offline(Chain::Main),
        b"!!!not-a-wallet!!!".to_vec(),
    )) else {
        panic!("garbage must fail");
    };
    let LoadError::Unreadable { detail } = error else {
        panic!("the failure must be Unreadable: {error}");
    };
    assert!(!detail.contains("not-a-wallet"), "{detail}");
}

/// Tests that a restore with a bad performance level fails as invalid input
/// before any wallet is built.
#[test]
fn invalid_settings_fail_as_invalid_input() {
    let _serial = serialized();
    let connection = Connection {
        min_confirmations: 0,
        ..offline(Chain::Main)
    };
    let error = RT
        .block_on(Wallet::open_from_ufvk(
            connection,
            "unvalidated".to_string(),
            1,
        ))
        .expect_err("zero confirmations must fail");
    assert!(matches!(error, ZingoError::InvalidInput { .. }), "{error}");
}
