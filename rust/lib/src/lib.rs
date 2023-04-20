#[macro_use]
extern crate lazy_static;

use std::cell::RefCell;
use std::sync::{Arc, Mutex};

use base64::{decode, encode};

use zingoconfig::{self, construct_lightwalletd_uri};
use zingolib::wallet::WalletBase;
use zingolib::{commands, lightclient::LightClient};

// We'll use a MUTEX to store a global lightclient instance,
// so we don't have to keep creating it. We need to store it here, in rust
// because we can't return such a complex structure back to JS
lazy_static! {
    static ref LIGHTCLIENT: Mutex<RefCell<Option<Arc<LightClient>>>> =
        Mutex::new(RefCell::new(None));
}
use zingoconfig::ChainType;
fn infer_chaintype(server_uri: &str) -> ChainType {
    // Attempt to guess type from known URIs
    match server_uri {
        "https://mainnet.lightwalletd.com:9067"
        | "https://lwdv2.zecwallet.co:1443"
        | "https://lwdv3.zecwallet.co" => ChainType::Mainnet,
        "https://testnet.lightwalletd.com:9067" => ChainType::Testnet,
        x if x.contains("127.0.0.1") | x.contains("localhost") => ChainType::Regtest,
        x if x.contains("fakemain") => ChainType::FakeMainnet,
        _ => panic!("Unrecognized server URI, is it a new server?  What chain does it serve?"),
    }
}

fn lock_client_return_seed(lightclient: LightClient) -> String {
    let seed = match lightclient.do_seed_phrase_sync() {
        Ok(s) => s.dump(),
        Err(e) => {
            return format!("Error: {}", e);
        }
    };

    let lc = Arc::new(lightclient);
    LightClient::start_mempool_monitor(lc.clone());

    LIGHTCLIENT.lock().unwrap().replace(Some(lc));

    seed
}
fn build_config_from_uri_chaintype(
    server_uri: String,
    chain_type: Option<ChainType>,
) -> zingoconfig::ZingoConfig {
    let lightwalletd_uri = construct_lightwalletd_uri(Some(server_uri));
    let chaintype = match chain_type {
        Some(chaintype) => chaintype,
        None => infer_chaintype(&lightwalletd_uri.to_string()),
    };
    match zingolib::load_clientconfig(lightwalletd_uri, None, chaintype) {
        Ok(c) => c,
        Err(e) => {
            panic!("Error: {}", e);
        }
    }
}
pub fn init_new(server_uri: String, data_dir: String, chain_type: Option<ChainType>) -> String {
    let mut config = build_config_from_uri_chaintype(server_uri.clone(), chain_type);

    config.set_data_dir(data_dir);

    let block_height = get_latest_block(server_uri)
        .parse::<u64>()
        .expect("To parse out a u64");
    let lightclient = match LightClient::new(&config, block_height.saturating_sub(100)) {
        Ok(l) => l,
        Err(e) => {
            return format!("Error: {}", e);
        }
    };
    lock_client_return_seed(lightclient)
}

pub fn init_from_seed(
    server_uri: String,
    seed: String,
    birthday: u64,
    data_dir: String,
    chain_type: Option<ChainType>,
) -> String {
    let mut config = build_config_from_uri_chaintype(server_uri, chain_type);

    config.set_data_dir(data_dir);

    let lightclient = match LightClient::new_from_wallet_base(
        WalletBase::MnemonicPhrase(seed),
        &config,
        birthday,
        false,
    ) {
        Ok(l) => l,
        Err(e) => {
            return format!("Error: {}", e);
        }
    };
    lock_client_return_seed(lightclient)
}

pub fn init_from_b64(
    server_uri: String,
    base64_data: String,
    data_dir: String,
    chain_type: Option<ChainType>,
) -> String {
    let mut config = build_config_from_uri_chaintype(server_uri, chain_type);

    config.set_data_dir(data_dir);

    let decoded_bytes = match decode(&base64_data) {
        Ok(b) => b,
        Err(e) => {
            return format!("Error: Decoding Base64: {}", e);
        }
    };

    let lightclient = match LightClient::read_wallet_from_buffer(&config, &decoded_bytes[..]) {
        Ok(l) => l,
        Err(e) => {
            return format!("Error: {}", e);
        }
    };
    lock_client_return_seed(lightclient)
}

pub fn save_to_b64() -> String {
    // Return the wallet as a base64 encoded string
    let lightclient: Arc<LightClient>;
    {
        let lc = LIGHTCLIENT.lock().unwrap();

        if lc.borrow().is_none() {
            return format!("Error: Light Client is not initialized");
        }

        lightclient = lc.borrow().as_ref().unwrap().clone();
    };

    match lightclient.do_save_to_buffer_sync() {
        Ok(buf) => encode(&buf),
        Err(e) => {
            format!("Error: {}", e)
        }
    }
}

pub fn execute(cmd: String, args_list: String) -> String {
    let resp: String;
    {
        let lightclient: Arc<LightClient>;
        {
            let lc = LIGHTCLIENT.lock().unwrap();

            if lc.borrow().is_none() {
                return format!("Error: Light Client is not initialized");
            }

            lightclient = lc.borrow().as_ref().unwrap().clone();
        };

        let args = if args_list.is_empty() {
            vec![]
        } else {
            vec![args_list.as_ref()]
        };
        resp = commands::do_user_command(&cmd, &args, lightclient.as_ref()).clone();
    };

    resp
}

pub fn get_latest_block(server_uri: String) -> String {
    let lightwalletd_uri = construct_lightwalletd_uri(Some(server_uri));
    zingolib::get_latest_block_height(lightwalletd_uri).to_string()
}
