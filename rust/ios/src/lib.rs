use std::os::raw::{c_char};
use std::ffi::{CString, CStr};

#[no_mangle]
pub extern fn rust_free(s: *mut c_char) {
    unsafe {
        if s.is_null() { return }
        CString::from_raw(s)
    };
}

#[no_mangle]
pub extern fn init_new(server_uri: *const c_char) -> *mut c_char {
    let c_str = unsafe { CStr::from_ptr(server_uri) };
    let server_uri = match c_str.to_str() {
        Err(_) => {
            return CString::new("Error parsing 'server_uri' argument".to_owned()).unwrap().into_raw()
        },
        Ok(string) => string,
    }.to_string();

    let seed = rustlib::init_new(server_uri);

    return CString::new(seed).unwrap().into_raw();
}

#[no_mangle]
pub extern fn initfromseed(server_uri: *const c_char, seed: *const c_char, birthday: *const c_char) -> *mut c_char {
    let c_str = unsafe { CStr::from_ptr(server_uri) };
    let server_uri = match c_str.to_str() {
        Err(_) => {
            return CString::new("Error parsing 'server_uri' argument".to_owned()).unwrap().into_raw()
        },
        Ok(string) => string,
    }.to_string();

    let c_str = unsafe { CStr::from_ptr(seed) };
    let seed = match c_str.to_str() {
        Err(_) => {
            return CString::new("Error parsing 'seed' argument".to_owned()).unwrap().into_raw()
        },
        Ok(string) => string,
    }.to_string();

    let c_str = unsafe { CStr::from_ptr(birthday) };
    let birthday = match c_str.to_str() {
        Err(_) => {
            return CString::new("Error parsing 'birthday' argument".to_owned()).unwrap().into_raw()
        },
        Ok(string) => string,
    }.to_string().parse::<u64>().unwrap();

    let seed = rustlib::init_from_seed(server_uri, seed, birthday);
    return CString::new(seed).unwrap().into_raw();
}


#[no_mangle]
pub extern fn initfromb64(server_uri: *const c_char, base64: *const c_char) -> *mut c_char {
    let c_str = unsafe { CStr::from_ptr(server_uri) };
    let server_uri = match c_str.to_str() {
        Err(_) => {
            return CString::new("Error parsing 'server_uri' argument".to_owned()).unwrap().into_raw()
        },
        Ok(string) => string,
    }.to_string();

    let c_str = unsafe { CStr::from_ptr(base64) };
    let base64 = match c_str.to_str() {
        Err(_) => {
            return CString::new("Error parsing 'base64' argument".to_owned()).unwrap().into_raw()
        },
        Ok(string) => string,
    }.to_string();

    let seed = rustlib::init_from_b64(server_uri, base64);

    return CString::new(seed).unwrap().into_raw();
}

#[no_mangle]
pub extern fn save() -> *mut c_char {
    // Return the wallet as a base64 encoded string
    let encoded = rustlib::save_to_b64();
    return CString::new(encoded).unwrap().into_raw();
}


#[no_mangle]
pub extern fn execute(cmd: *const c_char, args_list: *const c_char) -> *mut c_char {
    let c_str = unsafe { CStr::from_ptr(cmd) };
    let cmd = match c_str.to_str() {
        Err(_) => {
            return CString::new("Error parsing 'cmd' argument".to_owned()).unwrap().into_raw()
        },
        Ok(string) => string,
    }.to_string();

    let c_str = unsafe { CStr::from_ptr(args_list) };
    let args_list = match c_str.to_str() {
        Err(_) => {
            return CString::new("Error parsing 'arg_list' argument".to_owned()).unwrap().into_raw()
        },
        Ok(string) => string,
    }.to_string();

    let resp = rustlib::execute(cmd, args_list);

    return CString::new(resp).unwrap().into_raw();
}