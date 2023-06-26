#![forbid(unsafe_code)]
#![cfg(feature = "local_env")]
use env_logger;
use zingo_testutils::{self, scenarios};

#[tokio::test]
async fn execute_address() {
    env_logger::init();
    let (_regtest_manager, child_process_handler, lightclient) =
        scenarios::basic_no_spendable().await;

    let _addresses = dbg!(lightclient.do_addresses().await);
    assert_eq!(1, 2);

    // Unneeded, but more explicit than having child_process_handler be an unused variable
    drop(child_process_handler);
}
