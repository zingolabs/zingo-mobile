#[cfg(not(feature = "regchest"))]
use zingo_testutils::{self, scenarios};

use darkside_tests::utils::{prepare_darksidewalletd, DarksideHandler};

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

async fn change_custom_server(abi: &str) {
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "change_custom_server");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn change_custom_regtest_server(abi: &str) {
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
        zingomobile_utils::android_e2e_test(abi, "change_custom_regtest_server");

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

async fn change_custom_testnet_server(abi: &str) {
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "change_custom_testnet_server");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn change_server_from_list(abi: &str) {
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "change_server_from_list");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn new_wallet(abi: &str) {
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "new_wallet");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn screen_awake(abi: &str) {
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "screen_awake");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn send(abi: &str) {
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
        zingomobile_utils::android_e2e_test(abi, "send");

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

async fn sync_report(abi: &str) {
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "sync_report");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn transaction_history(abi: &str) {
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "transaction_history");

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
    use super::*;
    const ABI: &str = "x86_64";

    #[tokio::test]
    async fn reload_while_tx_pending() {
        super::reload_while_tx_pending(ABI).await;
    }

    #[tokio::test]
    async fn change_custom_server() {
        super::change_custom_server(ABI).await;
    }

    #[tokio::test]
    async fn change_custom_regtest_server() {
        super::change_custom_regtest_server(ABI).await;
    }

    #[tokio::test]
    async fn change_custom_testnet_server() {
        super::change_custom_testnet_server(ABI).await;
    }

    #[tokio::test]
    async fn change_server_from_list() {
        super::change_server_from_list(ABI).await;
    }

    #[tokio::test]
    async fn new_wallet() {
        super::new_wallet(ABI).await;
    }

    #[tokio::test]
    async fn screen_awake() {
        super::screen_awake(ABI).await;
    }

    #[tokio::test]
    async fn send() {
        super::send(ABI).await;
    }

    #[tokio::test]
    async fn sync_report() {
        super::sync_report(ABI).await;
    }

    #[tokio::test]
    async fn transaction_history() {
        super::transaction_history(ABI).await;
    }

    mod darkside {
        const ABI: &str = "x86_64";

        #[tokio::test]
        async fn simple_sync() {
            super::simple_sync(ABI).await;
        }
    }
}
