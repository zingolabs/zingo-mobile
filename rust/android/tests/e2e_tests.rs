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
        use darkside_tests::{
            constants,
            utils::{
                generate_blocks, init_darksidewalletd, read_block_dataset,
                send_and_stage_transaction, stage_transaction, update_tree_state_and_apply_staged,
            },
        };
        use zingo_testutils::{
            data::seeds, regtest::get_cargo_manifest_dir, scenarios::setup::ClientBuilder,
        };
        use zingoconfig::RegtestNetwork;
        use zingolib::get_base_address;

        #[tokio::test]
        async fn simple_sync() {
            const BLOCKCHAIN_HEIGHT: i32 = 1_000;

            // initialise darksidewalletd and stage blocks and initial funds
            let (_handler, connector) = init_darksidewalletd(Some(20000)).await.unwrap();
            connector
                .stage_blocks_create(2, BLOCKCHAIN_HEIGHT - 1, 0)
                .await
                .unwrap();
            stage_transaction(
                &connector,
                2,
                constants::ABANDON_TO_DARKSIDE_SAP_10_000_000_ZAT,
            )
            .await;

            // apply blockchain
            connector.apply_staged(BLOCKCHAIN_HEIGHT).await.unwrap();

            let (exit_code, output, error) =
                zingomobile_utils::android_e2e_test("darkside_simple_sync");

            println!("Exit Code: {}", exit_code);
            println!("Output: {}", output);
            println!("Error: {}", error);

            assert_eq!(exit_code, 0);
        }

        #[tokio::test]
        async fn interrupt_sync_e2e_chainbuild() {
            const BLOCKCHAIN_HEIGHT: i32 = 150_000;
            let mut current_blockheight: i32;
            let mut target_blockheight: i32;

            // initialise darksidewalletd and stage initial funds
            let (handler, connector) = init_darksidewalletd(None).await.unwrap();
            target_blockheight = 2;
            let mut current_tree_state = stage_transaction(
                &connector,
                target_blockheight as u64,
                constants::ABANDON_TO_DARKSIDE_SAP_10_000_000_ZAT,
            )
            .await;
            current_blockheight = target_blockheight;

            // build clients
            let mut client_builder =
                ClientBuilder::new(connector.0.clone(), handler.darkside_dir.clone());
            let regtest_network = RegtestNetwork::all_upgrades_active();
            let darkside_client = client_builder
                .build_client(DARKSIDE_SEED.to_string(), 0, true, regtest_network)
                .await;

            // stage a send to self every thousand blocks
            for thousands_blocks_count in 1..(BLOCKCHAIN_HEIGHT / 1000) as u64 {
                target_blockheight = (thousands_blocks_count * 1000 - 1) as i32;
                generate_blocks(
                    &connector,
                    current_tree_state,
                    current_blockheight,
                    target_blockheight,
                    thousands_blocks_count as i32,
                )
                .await;
                darkside_client.do_sync(false).await.unwrap();
                target_blockheight += 1;
                current_tree_state = send_and_stage_transaction(
                    &connector,
                    &darkside_client,
                    &get_base_address!(darkside_client, "unified"),
                    40_000,
                    target_blockheight as u64,
                )
                .await;
                current_blockheight = target_blockheight;
            }

            // stage and apply final blocks
            generate_blocks(
                &connector,
                current_tree_state,
                current_blockheight,
                BLOCKCHAIN_HEIGHT,
                150,
            )
            .await;
            darkside_client.do_sync(false).await.unwrap();

            println!("do balance:");
            dbg!(darkside_client.do_balance().await);
            println!("do list_notes:");
            println!(
                "{}",
                json::stringify_pretty(darkside_client.do_list_notes(true).await, 4)
            );
        }
        // #[tokio::test]
        // async fn interrupt_sync_e2e_test() {
        //     // initialise darksidewalletd and stage first part of blockchain
        //     let (handler, connector) = init_darksidewalletd(None).await.unwrap();
        //     const BLOCKCHAIN_HEIGHT: i32 = 150_000;
        //     connector
        //         .stage_blocks_create(2, BLOCKCHAIN_HEIGHT - 1, 0)
        //         .await
        //         .unwrap();
        //     stage_transaction(
        //         &connector,
        //         2,
        //         constants::ABANDON_TO_DARKSIDE_SAP_10_000_000_ZAT,
        //     )
        //     .await;

        //     // build clients
        //     let mut client_builder = ClientBuilder::new(connector.0.clone(), handler.darkside_dir.clone());
        //     let regtest_network = RegtestNetwork::all_upgrades_active();
        //     let darkside_client = client_builder
        //         .build_client(DARKSIDE_SEED.to_string(), 0, true, regtest_network)
        //         .await;

        //     let tx_set_path = format!(
        //         "{}/{}",
        //         get_cargo_manifest_dir().to_string_lossy(),
        //         INTERRUPT_SYNC_TX_SET
        //     );
        //     let tx_set = read_block_dataset(tx_set_path);

        //     // stage a send to self every thousand blocks
        //     for thousands_blocks_count in 1..(BLOCKCHAIN_HEIGHT / 1000) as u64 {
        //         generate_blocks(&connector, thousands_blocks_count * 1000 - 1).await;
        //         stage_transaction(
        //             &connector,
        //             thousands_blocks_count * 1000,
        //             &tx_set[(thousands_blocks_count - 1) as usize],
        //         )
        //         .await;
        //     }

        //     // apply last part of the blockchain
        //     connector.apply_staged(BLOCKCHAIN_HEIGHT).await.unwrap();

        //     darkside_client.do_sync(true).await.unwrap();
        //     println!("do list transactions:");
        //     println!("{}", darkside_client.do_list_transactions().await.pretty(2));
        //     println!("do balance:");
        //     dbg!(darkside_client.do_balance().await);
        //     println!("do list_notes:");
        //     println!(
        //         "{}",
        //         json::stringify_pretty(darkside_client.do_list_notes(true).await, 4)
        //     );
        // }
    }
}
