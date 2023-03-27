#[macro_use]
extern crate lazy_static;

use std::cell::RefCell;
use std::sync::{Arc, Mutex};

use base64::{decode, encode};

use zingoconfig::construct_server_uri;
use zingolib::wallet::WalletBase;
use zingolib::{commands, lightclient::LightClient};

// We'll use a MUTEX to store a global lightclient instance,
// so we don't have to keep creating it. We need to store it here, in rust
// because we can't return such a complex structure back to JS
lazy_static! {
    static ref LIGHTCLIENT: Mutex<RefCell<Option<Arc<LightClient>>>> =
        Mutex::new(RefCell::new(None));
}

pub fn init_new(
    server_uri: String,
    data_dir: String,
) -> String {
    let server = construct_server_uri(Some(server_uri));

    let (mut config, latest_block_height) =
        match zingolib::load_clientconfig(server, None) {
            Ok((c, h)) => (c, h),
            Err(e) => {
                return format!("Error: {}", e);
            }
        };

    config.set_data_dir(data_dir);

    let lightclient = match LightClient::new(
        &config,
        latest_block_height.saturating_sub(100),
    ) {
        Ok(l) => l,
        Err(e) => {
            return format!("Error: {}", e);
        }
    };

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

pub fn init_from_seed(
    server_uri: String,
    seed: String,
    birthday: u64,
    data_dir: String,
) -> String {
    let server = construct_server_uri(Some(server_uri));

    let (mut config, _latest_block_height) =
        match zingolib::load_clientconfig(server, None) {
            Ok((c, h)) => (c, h),
            Err(e) => {
                return format!("Error: {}", e);
            }
        };

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

pub fn init_from_b64(
    server_uri: String,
    base64_data: String,
    data_dir: String,
) -> String {
    let server = construct_server_uri(Some(server_uri));

    let (mut config, _latest_block_height) =
        match zingolib::load_clientconfig(server, None) {
            Ok((c, h)) => (c, h),
            Err(e) => {
                return format!("Error: {}", e);
            }
        };

    config.set_data_dir(data_dir);

    let decoded_bytes = match decode(&base64_data) {
        Ok(b) => b,
        Err(e) => {
            return format!("Error: Decoding Base64: {}", e);
        }
    };

    let lightclient =
        match LightClient::read_wallet_from_buffer(&config, &decoded_bytes[..])
        {
            Ok(l) => l,
            Err(e) => {
                return format!("Error: {}", e);
            }
        };

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
        resp = commands::do_user_command(&cmd, &args, lightclient.as_ref())
            .clone();
    };

    resp
}

pub fn get_latest_block(server_uri: String) -> String {
    let server = construct_server_uri(Some(server_uri));
    let (_config, latest_block_height) =
        match zingolib::load_clientconfig(server, None) {
            Ok((c, h)) => (c, h),
            Err(e) => {
                return format!("Error: {}", e);
            }
        };

    let resp: String = latest_block_height.to_string();

    resp
}
