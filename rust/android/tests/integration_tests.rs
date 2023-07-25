#![forbid(unsafe_code)]
use test_utils;
use zingo_testutils::{self, scenarios};

#[tokio::test]
async fn offline_testsuite_arm32() {
    let (exit_code, output, error) =
        test_utils::android_integration_test("armeabi-v7a", "OfflineTestSuite");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

#[tokio::test]
async fn execute_sync_from_seed_arm32() {
    let (regtest_manager, _child_process_handler) = scenarios::unfunded_mobileclient().await;

    regtest_manager
        .generate_n_blocks(10)
        .expect("Failed to generate blocks.");

    let (exit_code, output, error) =
        test_utils::android_integration_test("armeabi-v7a", "ExecuteSyncFromSeed");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

#[tokio::test]
async fn execute_send_from_orchard_arm32() {
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_mobileclient(1_000_000).await;

    let (exit_code, output, error) =
        test_utils::android_integration_test("armeabi-v7a", "ExecuteSendFromOrchard");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}
