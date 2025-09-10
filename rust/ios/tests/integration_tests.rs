#[cfg(not(feature = "regchest"))]
use zingolib::testutils::scenarios;

// macos ci runner
#[cfg(feature = "ci")]
const MAC_SOCKET: Option<&str> = Some("unix:///Users/runner/.colima/default/docker.sock");

async fn offline_testsuite() {
    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoMobileTests/OfflineTestSuite");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoMobileTests/OfflineTestSuite");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_sync_from_seed() {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(MAC_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoMobileTests/ExecuteSyncFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoMobileTests/ExecuteSyncFromSeed");

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

async fn execute_send_from_orchard() {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(MAC_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoMobileTests/ExecuteSendFromOrchard");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoMobileTests/ExecuteSendFromOrchard");

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

async fn execute_currentprice_and_value_transfers_from_seed() {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_with_3_txs_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(MAC_SOCKET, Some("funded_orchard_with_3_txs_mobileclient"))
            .await
        {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::ios_integration_test(
        "ZingoMobileTests/UpdateCurrentPriceAndValueTransfersFromSeed",
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::ios_integration_test_ci(
        "ZingoMobileTests/UpdateCurrentPriceAndValueTransfersFromSeed",
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

async fn execute_sapling_balance_from_seed() {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker = match regchest_utils::launch(
        MAC_SOCKET,
        Some("funded_orchard_sapling_transparent_shielded_mobileclient"),
    )
    .await
    {
        Ok(d) => d,
        Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
    };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoMobileTests/ExecuteSaplingBalanceFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::aios_integration_test_ci("ZingoMobileTests/ExecuteSaplingBalanceFromSeed");

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

async fn execute_parse_addresses() {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker = match regchest_utils::launch(
        MAC_SOCKET,
        Some("funded_orchard_sapling_transparent_shielded_mobileclient"),
    )
    .await
    {
        Ok(d) => d,
        Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
    };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoMobileTests/ExecuteParseAddresses");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoMobileTests/ExecuteParseAddresses");

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
    mod ios {
        #[tokio::test]
        async fn offline_testsuite() {
            crate::offline_testsuite().await;
        }

        #[tokio::test]
        async fn execute_sync_from_seed() {
            crate::execute_sync_from_seed().await;
        }

        #[tokio::test]
        async fn execute_send_from_orchard() {
            crate::execute_send_from_orchard().await;
        }

        #[tokio::test]
        async fn execute_currentprice_and_value_transfers_from_seed() {
            crate::execute_currentprice_and_value_transfers_from_seed().await;
        }

        #[tokio::test]
        async fn execute_sapling_balance_from_seed() {
            crate::execute_sapling_balance_from_seed().await;
        }

        #[tokio::test]
        async fn execute_parse_addresses() {
            crate::execute_parse_addresses().await;
        }
    }
}
