#[cfg(not(feature = "regchest"))]
use zingo_testutils::{self, scenarios};

#[cfg(feature = "ci")]
const UNIX_SOCKET: Option<&str> = Some("/Users/runner/.colima/default/docker.sock");
#[cfg(all(not(feature = "ci"), feature = "regchest"))]
const UNIX_SOCKET: Option<&str> = None;

async fn reload_while_tx_pending(abi: &str) {
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
        zingomobile_utils::android_e2e_test(abi, "reload_while_tx_pending");

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

async fn simple_sync(abi: &str) {
    let darkside_handler = DarksideHandler::new(Some(20000));

    let server_id = zingoconfig::construct_lightwalletd_uri(Some(format!(
        "http://127.0.0.1:{}",
        darkside_handler.grpc_port
    )));
    prepare_darksidewalletd(server_id.clone(), true)
        .await
        .unwrap();

    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "darkside_simple_sync");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

mod e2e {
    const ABI: &str = "x86_64";

    #[tokio::test]
    async fn reload_while_tx_pending() {
        super::reload_while_tx_pending(ABI).await;
    }

    mod darkside {
        use darkside_tests::utils::{prepare_darksidewalletd, DarksideHandler};

        #[tokio::test]
        async fn simple_sync() {
            super::simple_sync(ABI).await;
        }
    }
}
