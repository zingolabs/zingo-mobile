#![forbid(unsafe_code)]
#![cfg(feature = "local_env")]
use env_logger;
use test_utils;
use zingo_testutils::{self, scenarios};

#[tokio::test]
async fn execute_address() {
    env_logger::init();
    let (_regtest_manager, child_process_handler) = scenarios::mobile_regtest_poc().await;

    let (exit_code, output, error) = test_utils::run_integration_test();

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);

    drop(child_process_handler);
}
