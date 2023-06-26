#![forbid(unsafe_code)]
#![cfg(feature = "local_env")]
use env_logger;
use zingo_testutils::{self, scenarios};

// pub mod darkside;
// use std::{fs::File, path::Path};
// use bip0039::Mnemonic;
// use data::seeds::HOSPITAL_MUSEUM_SEED;
// use json::JsonValue::{self, Null};
// use tokio::time::Instant;
// use tracing_test::traced_test;
// use zcash_address::unified::Ufvk;
// use zcash_client_backend::encoding::encode_payment_address;
// use zcash_primitives::{
//     consensus::Parameters,
//     transaction::{components::amount::DEFAULT_FEE, TxId},
// };
// use zingo_testutils::regtest::get_cargo_manifest_dir_parent;
// use zingoconfig::{ChainType, ZingoConfig};
// use zingolib::{
//     check_client_balances, get_base_address,
//     lightclient::LightClient,
//     wallet::{
//         data::TransactionMetadata,
//         keys::{
//             extended_transparent::ExtendedPrivKey,
//             unified::{Capability, WalletCapability},
//         },
//         LightWallet, Pool, WalletBase,
//     },
// };

#[tokio::test]
async fn execute_address() {
    env_logger::init();
    let (_regtest_manager, _child_process_handler, _lightclient) =
        scenarios::basic_no_spendable().await;
}
