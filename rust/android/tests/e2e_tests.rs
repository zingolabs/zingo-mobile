#[cfg(not(feature = "regchest"))]
use zingolib::testutils::scenarios;

use darkside_tests::utils::{prepare_darksidewalletd, DarksideHandler};

// ubuntu ci runner
#[cfg(feature = "ci")]
const UNIX_SOCKET: Option<&str> = Some("/var/run/docker.sock");
// macos ci runner
//const UNIX_SOCKET: Option<&str> = Some("`/Users/runner/.colima/default/docker.sock`");

#[cfg(all(not(feature = "ci"), feature = "regchest"))]
const UNIX_SOCKET: Option<&str> = None;

async fn tex_send_address(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(UNIX_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_e2e_test(abi, "tex_send_address");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test_ci(abi, "tex_send_address");

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

async fn shielding(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_transparent_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(UNIX_SOCKET, Some("funded_transparent_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_e2e_test(abi, "shielding");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_e2e_test_ci(abi, "shielding");

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

async fn parse_invalid_address(abi: &str) {
    #[cfg(not(feature = "regchest"))]
    let (_regtest_manager, _child_process_handler) =
        scenarios::funded_orchard_mobileclient(1_000_000).await;
    #[cfg(feature = "regchest")]
    let docker =
        match regchest_utils::launch(UNIX_SOCKET, Some("funded_orchard_mobileclient")).await {
            Ok(d) => d,
            Err(e) => panic!("Failed to launch regchest docker container: {:?}", e),
        };

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "parse_invalid_address");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test_ci(abi, "parse_invalid_address");

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

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "reload_while_tx_pending");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test_ci(abi, "reload_while_tx_pending");

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
    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "change_custom_server");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test_ci(abi, "change_custom_server");

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

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "change_custom_regtest_server");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test_ci(abi, "change_custom_regtest_server");

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
    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "change_custom_testnet_server");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test_ci(abi, "change_custom_testnet_server");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn change_server_from_list(abi: &str) {
    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "change_server_from_list");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test_ci(abi, "change_server_from_list");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn new_wallet(abi: &str) {
    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_e2e_test(abi, "new_wallet");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_e2e_test_ci(abi, "new_wallet");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn screen_awake(abi: &str) {
    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_e2e_test(abi, "screen_awake");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_e2e_test_ci(abi, "screen_awake");

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

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_e2e_test(abi, "send");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_e2e_test_ci(abi, "send");

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
    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) = zingomobile_utils::android_e2e_test(abi, "sync_report");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) = zingomobile_utils::android_e2e_test_ci(abi, "sync_report");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

async fn transaction_history(abi: &str) {
    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "transaction_history");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test_ci(abi, "transaction_history");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

// darkside is not working with regchest
async fn darkside_simple_sync(abi: &str) {
    let darkside_handler = DarksideHandler::new(Some(20000));

    let server_id = zingolib::config::construct_lightwalletd_uri(Some(format!(
        "http://127.0.0.1:{}",
        darkside_handler.grpc_port
    )));
    prepare_darksidewalletd(server_id.clone(), true)
        .await
        .unwrap();

    #[cfg(not(feature = "ci"))]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test(abi, "darkside_simple_sync");
    #[cfg(feature = "ci")]
    let (exit_code, output, error) =
        zingomobile_utils::android_e2e_test_ci(abi, "darkside_simple_sync");

    println!("Exit Code: {}", exit_code);
    println!("Output: {}", output);
    println!("Error: {}", error);

    assert_eq!(exit_code, 0);
}

mod e2e {
    mod x86_32 {
        const ABI: &str = "x86";

        #[tokio::test]
        async fn shielding() {
            crate::shielding(ABI).await;
        }

        #[tokio::test]
        async fn tex_send_address() {
            crate::tex_send_address(ABI).await;
        }

        #[tokio::test]
        async fn parse_invalid_address() {
            crate::parse_invalid_address(ABI).await;
        }

        #[tokio::test]
        async fn reload_while_tx_pending() {
            crate::reload_while_tx_pending(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_server() {
            crate::change_custom_server(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_regtest_server() {
            crate::change_custom_regtest_server(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_testnet_server() {
            crate::change_custom_testnet_server(ABI).await;
        }

        #[tokio::test]
        async fn change_server_from_list() {
            crate::change_server_from_list(ABI).await;
        }

        #[tokio::test]
        async fn new_wallet() {
            crate::new_wallet(ABI).await;
        }

        #[tokio::test]
        async fn screen_awake() {
            crate::screen_awake(ABI).await;
        }

        #[tokio::test]
        async fn send() {
            crate::send(ABI).await;
        }

        #[tokio::test]
        async fn sync_report() {
            crate::sync_report(ABI).await;
        }

        #[tokio::test]
        async fn transaction_history() {
            crate::transaction_history(ABI).await;
        }

        mod darkside {
            #[tokio::test]
            async fn darkside_simple_sync() {
                crate::darkside_simple_sync(super::ABI).await;
            }
        }
    }

    mod x86_64 {
        const ABI: &str = "x86_64";

        #[tokio::test]
        async fn shielding() {
            crate::shielding(ABI).await;
        }

        #[tokio::test]
        async fn tex_send_address() {
            crate::tex_send_address(ABI).await;
        }

        #[tokio::test]
        async fn parse_invalid_address() {
            crate::parse_invalid_address(ABI).await;
        }

        #[tokio::test]
        async fn reload_while_tx_pending() {
            crate::reload_while_tx_pending(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_server() {
            crate::change_custom_server(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_regtest_server() {
            crate::change_custom_regtest_server(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_testnet_server() {
            crate::change_custom_testnet_server(ABI).await;
        }

        #[tokio::test]
        async fn change_server_from_list() {
            crate::change_server_from_list(ABI).await;
        }

        #[tokio::test]
        async fn new_wallet() {
            crate::new_wallet(ABI).await;
        }

        #[tokio::test]
        async fn screen_awake() {
            crate::screen_awake(ABI).await;
        }

        #[tokio::test]
        async fn send() {
            crate::send(ABI).await;
        }

        #[tokio::test]
        async fn sync_report() {
            crate::sync_report(ABI).await;
        }

        #[tokio::test]
        async fn transaction_history() {
            crate::transaction_history(ABI).await;
        }

        mod darkside {
            #[tokio::test]
            async fn darkside_simple_sync() {
                crate::darkside_simple_sync(super::ABI).await;
            }
        }
    }

    mod arm32 {
        const ABI: &str = "armeabi-v7a";

        #[tokio::test]
        async fn shielding() {
            crate::shielding(ABI).await;
        }

        #[tokio::test]
        async fn tex_send_address() {
            crate::tex_send_address(ABI).await;
        }

        #[tokio::test]
        async fn parse_invalid_address() {
            crate::parse_invalid_address(ABI).await;
        }

        #[tokio::test]
        async fn reload_while_tx_pending() {
            crate::reload_while_tx_pending(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_server() {
            crate::change_custom_server(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_regtest_server() {
            crate::change_custom_regtest_server(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_testnet_server() {
            crate::change_custom_testnet_server(ABI).await;
        }

        #[tokio::test]
        async fn change_server_from_list() {
            crate::change_server_from_list(ABI).await;
        }

        #[tokio::test]
        async fn new_wallet() {
            crate::new_wallet(ABI).await;
        }

        #[tokio::test]
        async fn screen_awake() {
            crate::screen_awake(ABI).await;
        }

        #[tokio::test]
        async fn send() {
            crate::send(ABI).await;
        }

        #[tokio::test]
        async fn sync_report() {
            crate::sync_report(ABI).await;
        }

        #[tokio::test]
        async fn transaction_history() {
            crate::transaction_history(ABI).await;
        }

        mod darkside {
            #[tokio::test]
            async fn darkside_simple_sync() {
                crate::darkside_simple_sync(super::ABI).await;
            }
        }
    }

    mod arm64 {
        const ABI: &str = "arm64-v8a";

        #[tokio::test]
        async fn shielding() {
            crate::shielding(ABI).await;
        }

        #[tokio::test]
        async fn tex_send_address() {
            crate::tex_send_address(ABI).await;
        }

        #[tokio::test]
        async fn parse_invalid_address() {
            crate::parse_invalid_address(ABI).await;
        }

        #[tokio::test]
        async fn reload_while_tx_pending() {
            crate::reload_while_tx_pending(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_server() {
            crate::change_custom_server(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_regtest_server() {
            crate::change_custom_regtest_server(ABI).await;
        }

        #[tokio::test]
        async fn change_custom_testnet_server() {
            crate::change_custom_testnet_server(ABI).await;
        }

        #[tokio::test]
        async fn change_server_from_list() {
            crate::change_server_from_list(ABI).await;
        }

        #[tokio::test]
        async fn new_wallet() {
            crate::new_wallet(ABI).await;
        }

        #[tokio::test]
        async fn screen_awake() {
            crate::screen_awake(ABI).await;
        }

        #[tokio::test]
        async fn send() {
            crate::send(ABI).await;
        }

        #[tokio::test]
        async fn sync_report() {
            crate::sync_report(ABI).await;
        }

        #[tokio::test]
        async fn transaction_history() {
            crate::transaction_history(ABI).await;
        }

        mod darkside {
            #[tokio::test]
            async fn darkside_simple_sync() {
                crate::darkside_simple_sync(super::ABI).await;
            }
        }
    }
}
