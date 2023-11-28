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
                init_darksidewalletd, prepare_darksidewalletd, read_block_dataset,
                stage_transaction, update_tree_state_and_apply_staged,
                update_tree_states_for_transaction, DarksideConnector, DarksideHandler,
            },
        };
        use zingo_testutils::regtest::get_cargo_manifest_dir;

        #[tokio::test]
        async fn simple_sync() {
            let darkside_handler = DarksideHandler::new(Some(20000));

            let server_id = zingoconfig::construct_lightwalletd_uri(Some(format!(
                "http://127.0.0.1:{}",
                darkside_handler.grpc_port
            )));
            prepare_darksidewalletd(server_id.clone(), true)
                .await
                .unwrap();

            let (exit_code, output, error) =
                zingomobile_utils::android_e2e_test("darkside_simple_sync");

            println!("Exit Code: {}", exit_code);
            println!("Output: {}", output);
            println!("Error: {}", error);

            assert_eq!(exit_code, 0);
        }
        #[tokio::test]
        async fn interrupt_sync() {
            // initialise darksidewalletd and stage first part of blockchain
            let (_handler, connector) = init_darksidewalletd(Some(20000)).await.unwrap();
            const BLOCKCHAIN_HEIGHT: i32 = 150_000;
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

            let tx_set_path = format!(
                "{}/{}",
                get_cargo_manifest_dir().to_string_lossy(),
                constants::INTERRUPT_SYNC_TX_SET
            );
            let tx_set = read_block_dataset(tx_set_path);

            // stage a send to self every thousand blocks
            for thousands_blocks_count in 1..(BLOCKCHAIN_HEIGHT / 1000) as u64 {
                update_tree_state_and_apply_staged(&connector, thousands_blocks_count * 1000 - 1)
                    .await;
                stage_transaction(
                    &connector,
                    thousands_blocks_count * 1000,
                    &tx_set[(thousands_blocks_count - 1) as usize],
                )
                .await;
            }

            // apply last part of the blockchain
            connector.apply_staged(BLOCKCHAIN_HEIGHT).await.unwrap();

            let (exit_code, output, error) =
                zingomobile_utils::android_e2e_test("darkside_interrupt_sync");

            println!("Exit Code: {}", exit_code);
            println!("Output: {}", output);
            println!("Error: {}", error);

            assert_eq!(exit_code, 0);
        }
    }
}
