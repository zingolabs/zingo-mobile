#![forbid(unsafe_code)]

//! Project-local `uniffi-bindgen` for the mixnet proxy, pinned to the
//! `uniffi` version `mixnet-proxy` compiles against. Run it in library
//! mode against a built proxy library. Library mode reads the UniFFI metadata
//! statically, so a cross-compiled Android `.so` works on the host:
//!
//! ```text
//! cargo run --package zingo-uniffi-bindgen --bin zingo-uniffi-bindgen -- \
//!     generate --library <path>/libmixnet_proxy.so \
//!     --language kotlin --out-dir <out>
//! ```
//!
//! `scripts/generate_kotlin_bindings.mjs` and `consume-android-proxy` (the
//! workbench crate) drive it.

fn main() {
    uniffi_proxy::uniffi_bindgen_main()
}
