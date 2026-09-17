#![forbid(unsafe_code)]

//! Project-local `uniffi-bindgen` for the wallet library, pinned to the
//! workspace `uniffi` version `zingo` (rust/lib) compiles against. Run it
//! in library mode against an unstripped wallet library:
//!
//! ```text
//! cargo run --package zingo-uniffi-bindgen --bin zingo-wallet-uniffi-bindgen -- \
//!     generate --library rust/target/release/libzingo.dylib --language kotlin \
//!     --config rust/lib/uniffi.toml --out-dir <out>
//! ```
//!
//! `scripts/generate_kotlin_bindings.mjs` drives it.

fn main() {
    uniffi_wallet::uniffi_bindgen_main()
}
