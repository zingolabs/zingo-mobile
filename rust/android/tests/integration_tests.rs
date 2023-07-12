#![forbid(unsafe_code)]
#![cfg(feature = "local_env")]
use env_logger;
use zingo_testutils::{self, scenarios};

#[tokio::test]
async fn execute_address() {
    env_logger::init();
    let (_regtest_manager, child_process_handler) = scenarios::mobile_regtest_poc().await;

    drop(child_process_handler);
}
