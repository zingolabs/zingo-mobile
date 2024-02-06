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
        use darkside_tests::utils::{
            create_chainbuild_file, load_chainbuild_file,
            scenarios::{DarksideScenario, DarksideSender},
        };
        use zingolib::{get_base_address, testvectors::seeds, wallet::Pool};

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

        // A test for benchmarking number of transactions synced after 20 seconds in the background
        // This test has no asserts and should be run with --no-capture to show the final result
        #[ignore]
        #[tokio::test]
        async fn background_sync_benchmark_chainbuild() {
            const BLOCKCHAIN_HEIGHT: u64 = 90_000;
            let chainbuild_file = create_chainbuild_file("background_sync_benchmark");
            let mut scenario = DarksideScenario::new(Some(20_000)).await;
            scenario.build_faucet(Pool::Orchard).await;
            scenario
                .build_client(seeds::HOSPITAL_MUSEUM_SEED.to_string(), 1)
                .await;

            // stage a send to recipient every 200 blocks (block 50, 250, 450 etc.)
            for thousands_blocks_count in 0..BLOCKCHAIN_HEIGHT / 200 {
                scenario
                    .stage_and_apply_blocks(thousands_blocks_count * 200 + 49, 0)
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
            const BLOCKCHAIN_HEIGHT: u64 = 90_000;
            let transaction_set = load_chainbuild_file("background_sync_benchmark");
            let mut scenario = DarksideScenario::new(Some(20_000)).await;
            scenario.build_faucet(Pool::Orchard).await;
            scenario
                .build_client(seeds::HOSPITAL_MUSEUM_SEED.to_string(), 1)
                .await;

            // stage a send to recipient every 200 blocks (block 50, 250, 450 etc.)
            for thousands_blocks_count in 0..BLOCKCHAIN_HEIGHT / 200 {
                scenario
                    .stage_and_apply_blocks(thousands_blocks_count * 200 + 49, 0)
                    .await;
                scenario.stage_next_transaction(&transaction_set).await;
            }

            scenario.stage_and_apply_blocks(BLOCKCHAIN_HEIGHT, 0).await;

            let (exit_code, output, error) =
                zingomobile_utils::android_e2e_test("darkside_background_sync_benchmark");

            // DEBUG
            // println!("Exit Code: {}", exit_code);
            // println!("Output: {}", output);
            // println!("Error: {}", error);

            // Find the resulting balance from the log
            let line = error
                .lines()
                .map(|line| line.trim())
                .filter(|line| line.contains("Balance:"))
                .next()
                .unwrap();
            let mut word = line.split_whitespace();
            while word.next().unwrap() != "Balance:" {}
            let balance = word.next().unwrap();

            println!("RESULT");
            println!("Balance after background sync: {}", balance);

            assert_eq!(exit_code, 0);
        }

        // interrupt sync test needs updating to latest darkside framework and has not yet revealed a failing test
        //     #[ignore]
        //     #[tokio::test]
        //     async fn interrupt_sync_chainbuild() {
        //         const BLOCKCHAIN_HEIGHT: i32 = 150_000;
        //         let mut current_blockheight: i32;
        //         let mut target_blockheight: i32;

        //         // initialise darksidewalletd and stage initial funds
        //         let (handler, connector) = init_darksidewalletd(None).await.unwrap();
        //         target_blockheight = 2;
        //         let mut current_tree_state = stage_transaction(
        //             &connector,
        //             target_blockheight as u64,
        //             constants::ABANDON_TO_DARKSIDE_SAP_10_000_000_ZAT,
        //         )
        //         .await;
        //         current_blockheight = target_blockheight;

        //         // build clients
        //         let mut client_builder =
        //             ClientBuilder::new(connector.0.clone(), handler.darkside_dir.clone());
        //         let regtest_network = RegtestNetwork::all_upgrades_active();
        //         let darkside_client = client_builder
        //             .build_client(seeds::DARKSIDE_SEED.to_string(), 0, true, regtest_network)
        //             .await;

        //         // stage a send to self every thousand blocks
        //         for thousands_blocks_count in 1..(BLOCKCHAIN_HEIGHT / 1000) as u64 {
        //             target_blockheight = (thousands_blocks_count * 1000 - 1) as i32;
        //             generate_blocks(
        //                 &connector,
        //                 current_tree_state,
        //                 current_blockheight,
        //                 target_blockheight,
        //                 thousands_blocks_count as i32,
        //             )
        //             .await;
        //             darkside_client.do_sync(false).await.unwrap();
        //             target_blockheight += 1;
        //             current_tree_state = send_and_stage_transaction(
        //                 &connector,
        //                 &darkside_client,
        //                 &get_base_address!(darkside_client, "unified"),
        //                 40_000,
        //                 target_blockheight as u64,
        //             )
        //             .await;
        //             current_blockheight = target_blockheight;
        //         }

        //         // stage and apply final blocks
        //         generate_blocks(
        //             &connector,
        //             current_tree_state,
        //             current_blockheight,
        //             BLOCKCHAIN_HEIGHT,
        //             150,
        //         )
        //         .await;
        //         darkside_client.do_sync(false).await.unwrap();

        //         println!("do balance:");
        //         dbg!(darkside_client.do_balance().await);
        //         println!("do list_notes:");
        //         println!(
        //             "{}",
        //             json::stringify_pretty(darkside_client.do_list_notes(true).await, 4)
        //         );
        //     }
        //     #[tokio::test]
        //     async fn interrupt_sync_test() {
        //         const BLOCKCHAIN_HEIGHT: i32 = 150_000;
        //         let mut current_blockheight: i32;
        //         let mut target_blockheight: i32;

        //         // initialise darksidewalletd and stage initial funds
        //         let (_handler, connector) = init_darksidewalletd(Some(20000)).await.unwrap();
        //         target_blockheight = 2;
        //         let mut current_tree_state = stage_transaction(
        //             &connector,
        //             target_blockheight as u64,
        //             constants::ABANDON_TO_DARKSIDE_SAP_10_000_000_ZAT,
        //         )
        //         .await;
        //         current_blockheight = target_blockheight;

        //         let tx_set_path = format!(
        //             "{}/{}",
        //             zingo_testutils::regtest::get_cargo_manifest_dir().to_string_lossy(),
        //             constants::INTERRUPT_SYNC_TX_SET
        //         );
        //         let tx_set = read_dataset(tx_set_path);

        //         // stage a send to self every thousand blocks
        //         for thousands_blocks_count in 1..(BLOCKCHAIN_HEIGHT / 1000) as u64 {
        //             target_blockheight = (thousands_blocks_count * 1000 - 1) as i32;
        //             generate_blocks(
        //                 &connector,
        //                 current_tree_state,
        //                 current_blockheight,
        //                 target_blockheight,
        //                 thousands_blocks_count as i32,
        //             )
        //             .await;
        //             target_blockheight += 1;
        //             current_tree_state = stage_transaction(
        //                 &connector,
        //                 target_blockheight as u64,
        //                 &tx_set[(thousands_blocks_count - 1) as usize],
        //             )
        //             .await;
        //             current_blockheight = target_blockheight;
        //         }

        //         // stage and apply final blocks
        //         generate_blocks(
        //             &connector,
        //             current_tree_state,
        //             current_blockheight,
        //             BLOCKCHAIN_HEIGHT,
        //             150,
        //         )
        //         .await;

        //         let (exit_code, output, error) =
        //             zingomobile_utils::android_e2e_test("darkside_interrupt_sync");

        //         println!("Exit Code: {}", exit_code);
        //         println!("Output: {}", output);
        //         println!("Error: {}", error);

        //         assert_eq!(exit_code, 0);
        //     }
    }
}
