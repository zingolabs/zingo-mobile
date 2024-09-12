#[cfg(not(feature = "regchest"))]
use zingolib::testutils::{scenarios};

#[cfg(feature = "ci")]
const UNIX_SOCKET: Option<&str> = Some("/Users/runner/.colima/default/docker.sock");
#[cfg(all(not(feature = "ci"), feature = "regchest"))]
const UNIX_SOCKET: Option<&str> = None;

async fn offline_testsuite(abi: &str) {
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "OfflineTestSuite");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_sync_from_seed(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(UNIX_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSyncFromSeed");

    #[cfg(feature = "regchest")]
    match regchest_utils::close(&docker).await {
        Ok(_) => (),
        Err(e) => panic!("Failed to close regchest docker container: {:?}", e),
    }

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_send_from_orchard(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(UNIX_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSendFromOrchard");

    #[cfg(feature = "regchest")]
    match regchest_utils::close(&docker).await {
        Ok(_) => (),
        Err(e) => panic!("Failed to close regchest docker container: {:?}", e),
    }

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_currentprice_and_value_transfers_from_seed(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_with_3_txs_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(UNIX_SOCKET, Some("funded_orchard_with_3_txs_mobileclient"))
            .await
        {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "UpdateCurrentPriceAndValueTransfersFromSeed");

    #[cfg(feature = "regchest")]
    match regchest_utils::close(&docker).await {
        Ok(_) => (),
        Err(e) => panic!("Failed to close regchest docker container: {:?}", e),
    }

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_sapling_balance_from_seed(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker = match regchest_utils::launch(
        UNIX_SOCKET,
        Some("funded_orchard_sapling_transparent_shielded_mobileclient"),
    )
    .await
    {
        Ok(d) => d,
        Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
    };

    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSaplingBalanceFromSeed");

    #[cfg(feature = "regchest")]
    match regchest_utils::close(&docker).await {
        Ok(_) => (),
        Err(e) => panic!("Failed to close regchest docker container: {:?}", e),
    }

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

mod x86_32 {
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

    #[tokio::test]
    async fn execute_currentprice_and_value_transfers_from_seed() {
        super::execute_currentprice_and_value_transfers_from_seed(ABI).await;
    }

    #[tokio::test]
    async fn execute_sapling_balance_from_seed() {
        super::execute_sapling_balance_from_seed(ABI).await;
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
    async fn execute_currentprice_and_value_transfers_from_seed() {
        super::execute_currentprice_and_value_transfers_from_seed(ABI).await;
    }

    #[tokio::test]
    async fn execute_sapling_balance_from_seed() {
        super::execute_sapling_balance_from_seed(ABI).await;
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

    #[tokio::test]
    async fn execute_currentprice_and_value_transfers_from_seed() {
        super::execute_currentprice_and_value_transfers_from_seed(ABI).await;
    }

    #[tokio::test]
    async fn execute_sapling_balance_from_seed() {
        super::execute_sapling_balance_from_seed(ABI).await;
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

    #[tokio::test]
    async fn execute_currentprice_and_value_transfers_from_seed() {
        super::execute_currentprice_and_value_transfers_from_seed(ABI).await;
    }

    #[tokio::test]
    async fn execute_sapling_balance_from_seed() {
        super::execute_sapling_balance_from_seed(ABI).await;
    }
}
