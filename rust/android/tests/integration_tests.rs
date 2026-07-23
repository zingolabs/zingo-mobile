#[cfg(not(feature = "regchest"))]
use zcash_local_net::validator::Validator;
#[cfg(not(feature = "regchest"))]
use zingolib_testutils::scenarios;

// ubuntu ci runner
#[cfg(all(feature = "ci", feature = "regchest"))]
const UNIX_SOCKET: Option<&str> = Some("/var/run/docker.sock");

// macos ci runner
//#[cfg(feature = "ci", feature = "regchest")]
//const UNIX_SOCKET: Option<&str> = Some("unix:///Users/runner/.colima/default/docker.sock");

/// The launched chain's activation heights in the spec form the wallet's
/// `regtest:<schedule>` chain hint consumes, read back from the running
/// validator (infrastructure ADR 0003: the validator is the only heights
/// authority) rather than restated from the launch fixture. The regchest
/// path has no validator handle to query, so those runs pass no schedule
/// and the wallet keeps its historical default.
#[cfg(not(feature = "regchest"))]
async fn validator_activation_heights(validator: &impl Validator) -> String {
    let heights = validator.get_activation_heights().await;
    let fmt = |height: Option<u32>| height.map_or_else(|| "off".to_string(), |h| h.to_string());
    format!(
        "overwinter={},sapling={},blossom={},heartwood={},canopy={},nu5={},nu6={},nu6_1={},nu6_2={},nu6_3={},nu7={}",
        fmt(heights.overwinter()),
        fmt(heights.sapling()),
        fmt(heights.blossom()),
        fmt(heights.heartwood()),
        fmt(heights.canopy()),
        fmt(heights.nu5()),
        fmt(heights.nu6()),
        fmt(heights.nu6_1()),
        fmt(heights.nu6_2()),
        fmt(heights.nu6_3()),
        fmt(heights.nu7()),
    )
}

async fn execute_version_from_seed(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(not(feature = "regchest"))]
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);
    #[cfg(feature = "regchest")]
    let activation_heights: Option<String> = None;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(UNIX_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test(
        abi,
        "ExecuteVersionFromSeed",
        activation_heights.as_deref(),
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test_ci(
        abi,
        "ExecuteVersionFromSeed",
        activation_heights.as_deref(),
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

async fn execute_addresses_from_ufvk(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(not(feature = "regchest"))]
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);
    #[cfg(feature = "regchest")]
    let activation_heights: Option<String> = None;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(UNIX_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test(
        abi,
        "ExecuteAddressesFromUfvk",
        activation_heights.as_deref(),
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test_ci(
        abi,
        "ExecuteAddressesFromUfvk",
        activation_heights.as_deref(),
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

async fn execute_addresses_from_seed(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(not(feature = "regchest"))]
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);
    #[cfg(feature = "regchest")]
    let activation_heights: Option<String> = None;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(UNIX_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test(
        abi,
        "ExecuteAddressesFromSeed",
        activation_heights.as_deref(),
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test_ci(
        abi,
        "ExecuteAddressesFromSeed",
        activation_heights.as_deref(),
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

async fn execute_sync_from_seed(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(not(feature = "regchest"))]
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);
    #[cfg(feature = "regchest")]
    let activation_heights: Option<String> = None;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(UNIX_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test(
        abi,
        "ExecuteSyncFromSeed",
        activation_heights.as_deref(),
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test_ci(
        abi,
        "ExecuteSyncFromSeed",
        activation_heights.as_deref(),
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

async fn execute_send_from_orchard(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(not(feature = "regchest"))]
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);
    #[cfg(feature = "regchest")]
    let activation_heights: Option<String> = None;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(UNIX_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test(
        abi,
        "ExecuteSendFromOrchard",
        activation_heights.as_deref(),
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test_ci(
        abi,
        "ExecuteSendFromOrchard",
        activation_heights.as_deref(),
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

async fn execute_currentprice_and_value_transfers_from_seed(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let local_net = scenarios::funded_orchard_with_3_txs_mobileclient(1_000_000).await;
    #[cfg(not(feature = "regchest"))]
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);
    #[cfg(feature = "regchest")]
    let activation_heights: Option<String> = None;
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
        activation_heights.as_deref(),
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test_ci(
        abi,
        "UpdateCurrentPriceAndValueTransfersFromSeed",
        activation_heights.as_deref(),
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
    let local_net =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;
    #[cfg(not(feature = "regchest"))]
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);
    #[cfg(feature = "regchest")]
    let activation_heights: Option<String> = None;
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
    let (exit_code, output, error) = zingomobile_utils::android_integration_test(
        abi,
        "ExecuteSaplingBalanceFromSeed",
        activation_heights.as_deref(),
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test_ci(
        abi,
        "ExecuteSaplingBalanceFromSeed",
        activation_heights.as_deref(),
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

async fn execute_parse_address_for_tex(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let local_net =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;
    #[cfg(not(feature = "regchest"))]
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);
    #[cfg(feature = "regchest")]
    let activation_heights: Option<String> = None;
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
    let (exit_code, output, error) = zingomobile_utils::android_integration_test(
        abi,
        "ExecuteParseAddressForTex",
        activation_heights.as_deref(),
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test_ci(
        abi,
        "ExecuteParseAddressForTex",
        activation_heights.as_deref(),
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

async fn execute_parse_address_invalid(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let local_net =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;
    #[cfg(not(feature = "regchest"))]
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);
    #[cfg(feature = "regchest")]
    let activation_heights: Option<String> = None;
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
    let (exit_code, output, error) = zingomobile_utils::android_integration_test(
        abi,
        "ExecuteParseAddressInvalid",
        activation_heights.as_deref(),
    );
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_integration_test_ci(
        abi,
        "ExecuteParseAddressInvalid",
        activation_heights.as_deref(),
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
