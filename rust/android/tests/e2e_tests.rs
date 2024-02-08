// end-to-end tests currently require an emulated AVD and `yarn start` to be launched manually before running tests

#[cfg(not(feature = "regchest"))]
use zingo_testutils::{self, scenarios};

#[cfg(feature = "ci")]
const UNIX_SOCKET: Option<&str> = Some("/Users/runner/.colima/default/docker.sock");
#[cfg(all(not(feature = "ci"), feature = "regchest"))]
const UNIX_SOCKET: Option<&str> = None;

mod e2e {
    use super::*;

    #[tokio::test]
    async fn reload_while_tx_unconfirmed() {
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
            zingomobile_utils::android_e2e_test("reload_while_tx_unconfirmed");

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

    mod darkside {
        use darkside_tests::utils::scenarios::DarksideScenario;
        use zingolib::wallet::Pool;

        #[tokio::test]
        async fn simple_sync_test() {
            const BLOCKCHAIN_HEIGHT: u64 = 1_000;

            let mut scenario = DarksideScenario::new(Some(20_000)).await;
            scenario.build_faucet(Pool::Orchard).await;
            scenario.stage_and_apply_blocks(BLOCKCHAIN_HEIGHT, 0).await;

            let (exit_code, output, error) =
                zingomobile_utils::android_e2e_test("darkside_simple_sync");

            println!("Exit Code: {}", exit_code);
            println!("Output: {}", output);
            println!("Error: {}", error);

            assert_eq!(exit_code, 0);
        }

        #[cfg(feature = "benchmark")]
        mod benchmark {
            use super::*;
            use darkside_tests::utils::{
                create_chainbuild_file, load_chainbuild_file, scenarios::DarksideSender,
            };
            use zingolib::{get_base_address, testvectors::seeds};

            // A test for benchmarking number of blocks synced after 30 seconds in the background
            // This test has no asserts and should be run with --no-capture to show the final result
            #[ignore]
            #[tokio::test]
            async fn background_sync_benchmark_chainbuild() {
                const BLOCKCHAIN_HEIGHT: u64 = 112_500;
                const BLOCKS_PER_TX: u64 = 250;
                let chainbuild_file = create_chainbuild_file("background_sync_benchmark");
                let mut scenario = DarksideScenario::new(Some(20_000)).await;
                scenario.build_faucet(Pool::Orchard).await;
                scenario
                    .build_client(seeds::HOSPITAL_MUSEUM_SEED.to_string(), 1)
                    .await;

                // stage a send to recipient every 200 blocks (block 50, 1050, 2050 etc.)
                for tx_count in 1..=BLOCKCHAIN_HEIGHT / BLOCKS_PER_TX {
                    scenario
                        .stage_and_apply_blocks(tx_count * BLOCKS_PER_TX - 2, 0)
                        .await;
                    scenario.get_faucet().do_sync(false).await.unwrap();
                    scenario
                        .send_and_write_transaction(
                            DarksideSender::Faucet,
                            &get_base_address!(scenario.get_lightclient(0), "unified"),
                            10_000,
                            &chainbuild_file,
                        )
                        .await;
                }
            }
            #[tokio::test]
            async fn background_sync_benchmark_test() {
                const BLOCKCHAIN_HEIGHT: u64 = 112_500;
                const BLOCKS_PER_TX: u64 = 250;
                const TX_TO_VALUE_RATIO: f64 = 10_000.0;
                const FOREGROUND_SYNC_OFFSET: u64 = 74_000;
                let transaction_set = load_chainbuild_file("background_sync_benchmark");
                let mut scenario = DarksideScenario::new(Some(20_000)).await;
                scenario.build_faucet(Pool::Orchard).await;
                scenario
                    .build_client(seeds::HOSPITAL_MUSEUM_SEED.to_string(), 1)
                    .await;

                // stage a send to recipient every BLOCKS_PER_TX blocks
                for tx_count in 1..=BLOCKCHAIN_HEIGHT / BLOCKS_PER_TX {
                    scenario
                        .stage_and_apply_blocks(tx_count * BLOCKS_PER_TX - 2, 0)
                        .await;
                    scenario.stage_next_transaction(&transaction_set).await;
                }

                scenario.stage_and_apply_blocks(BLOCKCHAIN_HEIGHT, 0).await;

                let (exit_code, _output, error) =
                    zingomobile_utils::android_e2e_test("darkside_background_sync_benchmark");

                // // DEBUG
                // println!("Exit Code: {}", exit_code);
                // println!("Output: {}", output);
                // println!("Error: {}", error);

                let mut lines_with_balances =
                    error.lines().filter(|line| line.contains("Balance:"));

                fn find_balance_from_line(line: &str) -> f64 {
                    let mut balance = None;
                    let mut words = line.split_whitespace().peekable();

                    // iterate through words in line and when "Balance:" is found, take the next element
                    while let Some(word) = words.next() {
                        if word.contains("Balance:") {
                            balance = words.peek().copied();
                            break;
                        }
                    }
                    balance.unwrap().parse().expect("should find some balance")
                }

                let start_balance = find_balance_from_line(
                    lines_with_balances
                        .next()
                        .expect("should find a line with start balance"),
                );
                let end_balance = find_balance_from_line(
                    lines_with_balances
                        .next()
                        .expect("should find a line with end balance"),
                );

                let transactions_synced =
                    ((end_balance - start_balance) * TX_TO_VALUE_RATIO) as u64;
                let blocks_synced = transactions_synced * BLOCKS_PER_TX;
                let blocks_synced_in_background = blocks_synced
                    .checked_sub(FOREGROUND_SYNC_OFFSET)
                    .expect("total blocks synced should be larger than the foreground sync offset");

                println!("RESULT");
                println!(
                    "Approx. blocks synced in background: {}",
                    blocks_synced_in_background
                );

                assert_eq!(exit_code, 0);
            }
        }
    }
}
