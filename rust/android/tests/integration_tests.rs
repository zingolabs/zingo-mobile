#![forbid(unsafe_code)]
use test_utils;
use zingo_testutils::{self, scenarios};

#[tokio::test]
async fn run_offline_testsuite() {
    let (exit_code, output, error) = test_utils::run_integration_test("x86_64", "OfflineTestSuite");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

#[tokio::test]
async fn execute_sync_from_seed() {
    let (regtest_manager, child_process_handler) = scenarios::mobile_basic().await;

    regtest_manager
        .generate_n_blocks(10)
        .expect("Failed to generate blocks.");

    let (exit_code, output, error) =
        test_utils::run_integration_test("x86_64", "ExecuteSyncFromSeed");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);

    drop(child_process_handler);
}
