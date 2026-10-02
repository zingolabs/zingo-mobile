use zcash_local_net::validator::Validator;
use zingolib_testutils::scenarios;

/// The launched chain's activation heights in the spec form the wallet's
/// `regtest:<schedule>` chain hint consumes, read back from the running
/// validator (infrastructure ADR 0003: the validator is the only heights
/// authority) rather than restated from the launch fixture.
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

async fn execute_send_from_orchard(abi: &str) {
    let local_net = scenarios::funded_orchard_mobileclient(1_000_000).await;
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);

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

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_currentprice_and_value_transfers_from_seed(abi: &str) {
    let local_net = scenarios::funded_orchard_with_3_txs_mobileclient(1_000_000).await;
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);
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

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn execute_sapling_balance_from_seed(abi: &str) {
    let local_net =
        scenarios::funded_orchard_sapling_transparent_shielded_mobileclient(1_000_000).await;
    let activation_heights = Some(validator_activation_heights(local_net.validator()).await);
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

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

mod android_integration {
    mod x86_32 {
        const ABI: &str = "x86";

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
    }

    mod x86_64 {
        const ABI: &str = "x86_64";

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
    }

    mod arm32 {
        const ABI: &str = "armeabi-v7a";

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
    }

    mod arm64 {
        const ABI: &str = "arm64-v8a";

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
    }
}
