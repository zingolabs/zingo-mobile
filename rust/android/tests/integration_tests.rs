#[cfg(not(feature = "regchest"))]
use zingolib::testutils::scenarios;

// ubuntu ci runner
#[cfg(feature = "ci")]
const UNIX_SOCKET: Option<&str> = Some("/var/run/docker.sock");

// macos ci runner
#[cfg(target_os = "macos")]
const UNIX_SOCKET: Option<&str> = Some("unix:///Users/runner/.colima/default/docker.sock");

#[cfg(all(not(feature = "ci"), feature = "regchest", not(target_os = "macos")))]
const UNIX_SOCKET: Option<&str> = None;

async fn offline_testsuite(abi: &str) {
    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "OfflineTestSuite");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "OfflineTestSuite");

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

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSyncFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteSyncFromSeed");

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

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSendFromOrchard");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteSendFromOrchard");

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

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test(
        abi,
        "UpdateCurrentPriceAndValueTransfersFromSeed",
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test_ci(
        abi,
        "UpdateCurrentPriceAndValueTransfersFromSeed",
    );

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

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSaplingBalanceFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteSaplingBalanceFromSeed");

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

async fn execute_parse_addresses(abi: &str) {
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

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteParseAddresses");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteParseAddresses");

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

mod integration {
    mod x86_32 {
        const ABI: &str = "x86";

        #[tokio::test]
        async fn offline_testsuite() {
            crate::offline_testsuite(ABI).await;
        }

        #[tokio::test]
        async fn execute_sync_from_seed() {
            crate::execute_sync_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_send_from_orchard() {
            crate::execute_send_from_orchard(ABI).await;
        }

        #[tokio::test]
        async fn execute_currentprice_and_value_transfers_from_seed() {
            crate::execute_currentprice_and_value_transfers_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_sapling_balance_from_seed() {
            crate::execute_sapling_balance_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_parse_addresses() {
            crate::execute_parse_addresses(ABI).await;
        }
    }

    mod x86_64 {
        const ABI: &str = "x86_64";

        #[tokio::test]
        async fn offline_testsuite() {
            crate::offline_testsuite(ABI).await;
        }

        #[tokio::test]
        async fn execute_sync_from_seed() {
            crate::execute_sync_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_send_from_orchard() {
            crate::execute_send_from_orchard(ABI).await;
        }

        #[tokio::test]
        async fn execute_currentprice_and_value_transfers_from_seed() {
            crate::execute_currentprice_and_value_transfers_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_sapling_balance_from_seed() {
            crate::execute_sapling_balance_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_parse_addresses() {
            crate::execute_parse_addresses(ABI).await;
        }
    }

    mod arm32 {
        const ABI: &str = "armeabi-v7a";

        #[tokio::test]
        async fn offline_testsuite() {
            crate::offline_testsuite(ABI).await;
        }

        #[tokio::test]
        async fn execute_sync_from_seed() {
            crate::execute_sync_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_send_from_orchard() {
            crate::execute_send_from_orchard(ABI).await;
        }

        #[tokio::test]
        async fn execute_currentprice_and_value_transfers_from_seed() {
            crate::execute_currentprice_and_value_transfers_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_sapling_balance_from_seed() {
            crate::execute_sapling_balance_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_parse_addresses() {
            crate::execute_parse_addresses(ABI).await;
        }
    }

    mod arm64 {
        const ABI: &str = "arm64-v8a";

        #[tokio::test]
        async fn offline_testsuite() {
            crate::offline_testsuite(ABI).await;
        }

        #[tokio::test]
        async fn execute_sync_from_seed() {
            crate::execute_sync_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_send_from_orchard() {
            crate::execute_send_from_orchard(ABI).await;
        }

        #[tokio::test]
        async fn execute_currentprice_and_value_transfers_from_seed() {
            crate::execute_currentprice_and_value_transfers_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_sapling_balance_from_seed() {
            crate::execute_sapling_balance_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_parse_addresses() {
            crate::execute_parse_addresses(ABI).await;
        }
    }
}
