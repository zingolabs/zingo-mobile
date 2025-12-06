#[cfg(not(feature = "regchest"))]
use zingolib_testutils::scenarios;

// ubuntu ci runner
//#[cfg(all(feature = "ci", feature = "regchest"))]
//const MAC_SOCKET: Option<&str> = Some("/var/run/docker.sock");

// macos ci runner
#[cfg(all(feature = "ci", feature = "regchest"))]
const MAC_SOCKET: Option<&str> = Some("unix:///Users/runner/.colima/default/docker.sock");

async fn offline_testsuite() {
    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoTests/OfflineTestSuite");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/OfflineTestSuite");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_sync_from_seed() {
    #[cfg(not(feature = "regchest"))]
    let _local_net =
        scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(MAC_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteSyncFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteSyncFromSeed");

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
    let _local_net =
        scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(MAC_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteSendFromOrchard");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteSendFromOrchard");

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
    let _local_net =
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
        "ZingoTests/UpdateCurrentPriceAndValueTransfersFromSeed",
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::ios_integration_test_ci(
        "ZingoTests/UpdateCurrentPriceAndValueTransfersFromSeed",
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
    let _local_net =
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
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteSaplingBalanceFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteSaplingBalanceFromSeed");

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

async fn execute_parse_address_for_tex() {
    #[cfg(not(feature = "regchest"))]
    let _local_net =
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
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteParseAddressForTex");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteParseAddressForTex");

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

async fn execute_parse_address_invalid() {
    #[cfg(not(feature = "regchest"))]
    let _local_net =
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
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteParseAddressInvalid");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteParseAddressInvalid");

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

mod ios_integration {
    mod universal {
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
        async fn execute_parse_address_for_tex() {
            crate::execute_parse_address_for_tex().await;
        }

        #[tokio::test]
        async fn execute_parse_address_invalid() {
            crate::execute_parse_address_invalid().await;
        }
    }
}
