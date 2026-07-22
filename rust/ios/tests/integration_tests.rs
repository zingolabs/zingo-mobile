use zingolib_testutils::scenarios;

async fn execute_version_from_seed() {
    let _local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteVersionFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteVersionFromSeed");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_addresses_from_ufvk() {
    let _local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteAddressesFromUfvk");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteAddressesFromUfvk");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_addresses_from_seed() {
    let _local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteAddressesFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteAddressesFromSeed");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_sync_from_seed() {
    let _local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteSyncFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteSyncFromSeed");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_send_from_orchard() {
    let _local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteSendFromOrchard");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteSendFromOrchard");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_currentprice_and_value_transfers_from_seed() {
    let _local_net = scenarios::funded_orchard_with_3_txs_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::ios_integration_test(
        "ZingoTests/UpdateCurrentPriceAndValueTransfersFromSeed",
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::ios_integration_test_ci(
        "ZingoTests/UpdateCurrentPriceAndValueTransfersFromSeed",
    );

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_sapling_balance_from_seed() {
    let _local_net =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteSaplingBalanceFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteSaplingBalanceFromSeed");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_parse_address_for_tex() {
    let _local_net =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteParseAddressForTex");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteParseAddressForTex");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_parse_address_invalid() {
    let _local_net =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test("ZingoTests/ExecuteParseAddressInvalid");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::ios_integration_test_ci("ZingoTests/ExecuteParseAddressInvalid");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

mod ios_integration {
    mod universal {
        #[tokio::test]
        async fn execute_version_from_seed() {
            crate::execute_version_from_seed().await;
        }

        #[tokio::test]
        async fn execute_addresses_from_ufvk() {
            crate::execute_addresses_from_ufvk().await;
        }

        #[tokio::test]
        async fn execute_addresses_from_seed() {
            crate::execute_addresses_from_seed().await;
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
