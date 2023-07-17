#![forbid(unsafe_code)]
use test_utils;
use zingo_testutils::{self, scenarios};

#[tokio::test]
async fn execute_sync() {
    let (regtest_manager, child_process_handler) = scenarios::mobile_basic().await;

    regtest_manager
        .generate_n_blocks(20)
        .expect("Failed to generate blocks.");

    let (exit_code, output, error) = test_utils::run_integration_test();

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);

    drop(child_process_handler);
}

// async fn execute_address() {
//     let (_regtest_manager, child_process_handler) = scenarios::mobile_basic().await;

//     let (exit_code, output, error) = test_utils::run_integration_test();

//     println!("Exit Code: {}", exit_code);
//     println!("Output: {}", output);
//     println!("Error: {}", error);

//     assert_eq!(exit_code, 0);

//     drop(child_process_handler);
// }
