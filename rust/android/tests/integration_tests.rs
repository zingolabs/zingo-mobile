use zingolib_testutils::scenarios;

async fn execute_version_from_seed(abi: &str) {
    let _local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteVersionFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteVersionFromSeed");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_addresses_from_ufvk(abi: &str) {
    let _local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteAddressesFromUfvk");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteAddressesFromUfvk");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_addresses_from_seed(abi: &str) {
    let _local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteAddressesFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteAddressesFromSeed");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_sync_from_seed(abi: &str) {
    let _local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSyncFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteSyncFromSeed");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_send_from_orchard(abi: &str) {
    let _local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSendFromOrchard");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteSendFromOrchard");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_currentprice_and_value_transfers_from_seed(abi: &str) {
    let _local_net = scenarios::funded_orchard_with_3_txs_mobileclient(1_000_000).await;

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

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_sapling_balance_from_seed(abi: &str) {
    let _local_net =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteSaplingBalanceFromSeed");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteSaplingBalanceFromSeed");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_parse_address_for_tex(abi: &str) {
    let _local_net =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteParseAddressForTex");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteParseAddressForTex");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_parse_address_invalid(abi: &str) {
    let _local_net =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test(abi, "ExecuteParseAddressInvalid");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_integration_test_ci(abi, "ExecuteParseAddressInvalid");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

mod android_integration {
    mod x86_32 {
        const ABI: &str = "x86";

        #[tokio::test]
        async fn execute_version_from_seed() {
            crate::execute_version_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_addresses_from_ufvk() {
            crate::execute_addresses_from_ufvk(ABI).await;
        }

        #[tokio::test]
        async fn execute_addresses_from_seed() {
            crate::execute_addresses_from_seed(ABI).await;
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
        async fn execute_parse_address_for_tex() {
            crate::execute_parse_address_for_tex(ABI).await;
        }

        #[tokio::test]
        async fn execute_parse_address_invalid() {
            crate::execute_parse_address_invalid(ABI).await;
        }
    }

    mod x86_64 {
        const ABI: &str = "x86_64";

        #[tokio::test]
        async fn execute_version_from_seed() {
            crate::execute_version_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_addresses_from_ufvk() {
            crate::execute_addresses_from_ufvk(ABI).await;
        }

        #[tokio::test]
        async fn execute_addresses_from_seed() {
            crate::execute_addresses_from_seed(ABI).await;
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
        async fn execute_parse_address_for_tex() {
            crate::execute_parse_address_for_tex(ABI).await;
        }

        #[tokio::test]
        async fn execute_parse_address_invalid() {
            crate::execute_parse_address_invalid(ABI).await;
        }
    }

    mod arm32 {
        const ABI: &str = "armeabi-v7a";

        #[tokio::test]
        async fn execute_version_from_seed() {
            crate::execute_version_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_addresses_from_ufvk() {
            crate::execute_addresses_from_ufvk(ABI).await;
        }

        #[tokio::test]
        async fn execute_addresses_from_seed() {
            crate::execute_addresses_from_seed(ABI).await;
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
        async fn execute_parse_address_for_tex() {
            crate::execute_parse_address_for_tex(ABI).await;
        }

        #[tokio::test]
        async fn execute_parse_address_invalid() {
            crate::execute_parse_address_invalid(ABI).await;
        }
    }

    mod arm64 {
        const ABI: &str = "arm64-v8a";

        #[tokio::test]
        async fn execute_version_from_seed() {
            crate::execute_version_from_seed(ABI).await;
        }

        #[tokio::test]
        async fn execute_addresses_from_ufvk() {
            crate::execute_addresses_from_ufvk(ABI).await;
        }

        #[tokio::test]
        async fn execute_addresses_from_seed() {
            crate::execute_addresses_from_seed(ABI).await;
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
        async fn execute_parse_address_for_tex() {
            crate::execute_parse_address_for_tex(ABI).await;
        }

        #[tokio::test]
        async fn execute_parse_address_invalid() {
            crate::execute_parse_address_invalid(ABI).await;
        }
    }
}
