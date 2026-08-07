#![forbid(unsafe_code)]

//! consume-android-shim: stage the Nym proxy shim bundle into the app.
//!
//! zingolib's `makers bundle-android-shim` (its workbench crate) cross-compiles
//! the UniFFI proxy shim `zingo-nym-proxy-ffi` for every shipped ABI and lays
//! out a bundle tree:
//!
//! ```text
//! <bundle>/jniLibs/<abi>/libzingo_nym_proxy_ffi.so   (one per ABI)
//! <bundle>/kotlin/uniffi/zingo_nym_proxy_ffi/…       (generated bindings)
//! ```
//!
//! This tool consumes that tree (send-over-nym step 3, zingolib#2513):
//!
//! - Each ABI's `.so` is copied into `android/app/src/main/jniLibs/<abi>/`,
//!   which is gitignored — the shared libraries are build products, exactly
//!   like the wallet's `libuniffi_zingo.so`.
//! - The generated Kotlin bindings are copied over the *committed* copy under
//!   `android/app/src/main/java/`, following the committed-`zingo.kt`
//!   precedent, so the app compiles without a local zingolib checkout. Drift
//!   between a stale committed binding and a fresh `.so` is caught at runtime
//!   by UniFFI's scaffolding checksum check, and the wire format itself is
//!   pinned by the golden contract test in the app's unit suite.
//!
//! Usage: `cargo run -p workbench --bin consume-android-shim -- --bundle <dir>`
//! where `<dir>` is the bundle root (zingolib's `target/android-shim` by
//! default on that side). A bundle built with a subset of ABIs (via that
//! tool's `--abi`) stages only what it carries; missing ABIs are reported.

use std::path::{Path, PathBuf};

/// The ABIs zingo-mobile ships (`reactNativeArchitectures` in
/// `android/gradle.properties`); must stay in step with zingolib's
/// `bundle-android-shim` SHIPPED_ABIS.
const SHIPPED_ABIS: [&str; 4] = ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"];

const SHIM_SO: &str = "libzingo_nym_proxy_ffi.so";

/// Which shipped ABIs a bundle tree carries and which it lacks. Pure, so the
/// partition is unit-testable without a real bundle on disk.
fn partition_abis(has_so: impl Fn(&str) -> bool) -> (Vec<&'static str>, Vec<&'static str>) {
    SHIPPED_ABIS.iter().partition(|abi| has_so(abi))
}

fn repo_root() -> PathBuf {
    // rust/workbench -> rust -> repo root.
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("workbench crate lives two levels below the repo root")
        .to_path_buf()
}

fn parse_bundle_arg() -> Result<PathBuf, String> {
    let mut bundle = None;
    let mut args = std::env::args().skip(1);
    while let Some(flag) = args.next() {
        match flag.as_str() {
            "--bundle" => {
                bundle = Some(args.next().ok_or("missing value for --bundle")?);
            }
            other => match other.strip_prefix("--bundle=") {
                Some(value) => bundle = Some(value.to_owned()),
                None => return Err(format!("unknown flag: {other}")),
            },
        }
    }
    let bundle = PathBuf::from(bundle.ok_or("--bundle is required")?);
    if !bundle.is_dir() {
        return Err(format!("bundle {} is not a directory", bundle.display()));
    }
    Ok(bundle)
}

/// Copy every regular file under `from` to the same relative path under `to`.
fn copy_tree(from: &Path, to: &Path) -> Result<usize, String> {
    let mut copied = 0;
    let entries =
        std::fs::read_dir(from).map_err(|e| format!("cannot read {}: {e}", from.display()))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("cannot read {}: {e}", from.display()))?;
        let source = entry.path();
        let target = to.join(entry.file_name());
        if source.is_dir() {
            copied += copy_tree(&source, &target)?;
        } else {
            std::fs::create_dir_all(to)
                .map_err(|e| format!("cannot create {}: {e}", to.display()))?;
            std::fs::copy(&source, &target)
                .map_err(|e| format!("cannot copy {}: {e}", source.display()))?;
            copied += 1;
        }
    }
    Ok(copied)
}

fn stage(bundle: &Path) -> Result<(), String> {
    let root = repo_root();

    let (present, missing) =
        partition_abis(|abi| bundle.join("jniLibs").join(abi).join(SHIM_SO).is_file());
    if present.is_empty() {
        return Err(format!(
            "no {SHIM_SO} for any shipped ABI under {}/jniLibs; \
             run zingolib's `makers bundle-android-shim` first",
            bundle.display()
        ));
    }
    for abi in &present {
        let target_dir = root.join("android/app/src/main/jniLibs").join(abi);
        std::fs::create_dir_all(&target_dir)
            .map_err(|e| format!("cannot create {}: {e}", target_dir.display()))?;
        let source = bundle.join("jniLibs").join(abi).join(SHIM_SO);
        std::fs::copy(&source, target_dir.join(SHIM_SO))
            .map_err(|e| format!("cannot copy {}: {e}", source.display()))?;
        println!("staged {abi}/{SHIM_SO}");
    }
    for abi in &missing {
        println!("note: bundle carries no {abi} shim; that ABI will not embed it");
    }

    let kotlin = bundle.join("kotlin");
    if !kotlin.is_dir() {
        return Err(format!(
            "bundle has no kotlin/ tree at {}",
            kotlin.display()
        ));
    }
    let bindings_root = root.join("android/app/src/main/java");
    let copied = copy_tree(&kotlin, &bindings_root)?;
    if copied == 0 {
        return Err(format!(
            "no Kotlin bindings found under {}",
            kotlin.display()
        ));
    }
    println!("refreshed {copied} Kotlin binding file(s) under android/app/src/main/java");
    Ok(())
}

fn main() {
    let result = parse_bundle_arg().and_then(|bundle| stage(&bundle));
    if let Err(message) = result {
        eprintln!("consume-android-shim: {message}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_bundle_partitions_to_all_present() {
        let (present, missing) = partition_abis(|_| true);
        assert_eq!(present, SHIPPED_ABIS.to_vec());
        assert!(missing.is_empty());
    }

    #[test]
    fn partial_bundle_reports_the_missing_abis() {
        let (present, missing) = partition_abis(|abi| abi == "x86_64");
        assert_eq!(present, vec!["x86_64"]);
        assert_eq!(missing, vec!["arm64-v8a", "armeabi-v7a", "x86"]);
    }

    #[test]
    fn empty_bundle_partitions_to_all_missing() {
        let (present, missing) = partition_abis(|_| false);
        assert!(present.is_empty());
        assert_eq!(missing, SHIPPED_ABIS.to_vec());
    }
}
