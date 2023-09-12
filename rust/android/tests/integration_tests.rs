#![forbid(unsafe_code)]
use zingo_testutils::{self, scenarios};

async fn offline_testsuite(abi: &str) {
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "OfflineTestSuite");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_sync_from_seed(abi: &str) {
    let (regtest_manager, _child_process_handler) = scenarios::unfunded_mobileclient().await;

    regtest_manager
        .generate_n_blocks(10)
        .expect("Failed to generate blocks.");

    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSyncFromSeed");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn regchest(abi: &str) {
    let docker = match regchest_utils::launch().await {
        Ok(d) => d,
        Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
    };

    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSendFromOrchard");

    match regchest_utils::close(docker).await {
        Ok(_) => (),
        Err(e) => panic!("Failed to close regchest docker container: {:?}", e),
    }

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_send_from_orchard(abi: &str) {
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_mobileclient(1_000_000).await;

    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSendFromOrchard");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

mod x86 {
    const ABI: &str = "x86";

    #[tokio::test]
    async fn offline_testsuite() {
        super::offline_testsuite(ABI).await;
    }

    #[tokio::test]
    async fn execute_sync_from_seed() {
        super::execute_sync_from_seed(ABI).await;
    }

    #[tokio::test]
    async fn execute_send_from_orchard() {
        super::execute_send_from_orchard(ABI).await;
    }
}

mod x86_64 {
    const ABI: &str = "x86_64";

    #[tokio::test]
    async fn offline_testsuite() {
        super::offline_testsuite(ABI).await;
    }

    #[tokio::test]
    async fn execute_sync_from_seed() {
        super::execute_sync_from_seed(ABI).await;
    }

    #[tokio::test]
    async fn execute_send_from_orchard() {
        super::execute_send_from_orchard(ABI).await;
    }

    #[tokio::test]
    async fn regchest() {
        super::regchest(ABI).await;
    }
}

mod arm32 {
    const ABI: &str = "armeabi-v7a";

    #[tokio::test]
    async fn offline_testsuite() {
        super::offline_testsuite(ABI).await;
    }

    #[tokio::test]
    async fn execute_sync_from_seed() {
        super::execute_sync_from_seed(ABI).await;
    }

    #[tokio::test]
    async fn execute_send_from_orchard() {
        super::execute_send_from_orchard(ABI).await;
    }
}

mod arm64 {
    const ABI: &str = "arm64-v8a";

    #[tokio::test]
    async fn offline_testsuite() {
        super::offline_testsuite(ABI).await;
    }

    #[tokio::test]
    async fn execute_sync_from_seed() {
        super::execute_sync_from_seed(ABI).await;
    }

    #[tokio::test]
    async fn execute_send_from_orchard() {
        super::execute_send_from_orchard(ABI).await;
    }
}
