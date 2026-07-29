#![forbid(unsafe_code)]

//! attest-android-shim: record that the staged Nym proxy shim is valid for
//! the currently pinned zingolib revision without a rebuild.
//!
//! The pin collaboration protocol lets test-only or netutils-untouched
//! upstream bumps skip the shim rebuild. This tool makes that skip safe: it
//! proves `zingo-netutils` (the shim's entire source workspace, including
//! the `webpki-verifier-shim` TLS patch) is identical between the revision
//! the staged `.so`s were built from and the revision `rust/Cargo.lock`
//! pins, and only then appends the pin to the provenance record that the
//! app's `verifyShimProvenance` gradle gate enforces. If netutils changed,
//! it refuses: rebuild the bundle in zingolib and restage with
//! `consume-android-shim`.
//!
//! Usage: `cargo run -p workbench --bin attest-android-shim -- --zingolib <checkout>`
//! where `<checkout>` is any zingolib checkout containing both revisions
//! (fetch first if the pin is newer than the checkout).

use std::path::{Path, PathBuf};

const PROVENANCE_FILE: &str = "android/app/src/main/jniLibs/shim-provenance.txt";
const CARGO_LOCK: &str = "rust/Cargo.lock";

/// The subtree whose change forces a shim rebuild: the standalone workspace
/// the proxy shim is built from.
const SHIM_WORKSPACE: &str = "zingo-netutils";

fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("workbench crate lives two levels below the repo root")
        .to_path_buf()
}

fn parse_zingolib_arg() -> Result<PathBuf, String> {
    let mut checkout = None;
    let mut args = std::env::args().skip(1);
    while let Some(flag) = args.next() {
        match flag.as_str() {
            "--zingolib" => {
                checkout = Some(args.next().ok_or("missing value for --zingolib")?);
            }
            other => match other.strip_prefix("--zingolib=") {
                Some(value) => checkout = Some(value.to_owned()),
                None => return Err(format!("unknown flag: {other}")),
            },
        }
    }
    let checkout = PathBuf::from(checkout.ok_or("--zingolib is required")?);
    if !checkout.is_dir() {
        return Err(format!("{} is not a directory", checkout.display()));
    }
    Ok(checkout)
}

/// The zingolib revision the manifest pins, from the lockfile's
/// `[[package]]` entry (`source = "git+…#<rev>"`).
fn pinned_rev(lock_text: &str) -> Option<String> {
    let mut lines = lock_text.lines();
    while let Some(line) = lines.next() {
        if line.trim() == "name = \"zingolib\"" {
            for source in lines.by_ref().take(2) {
                if let Some(rest) = source.trim().strip_prefix("source = ") {
                    return rest.trim_matches('"').rsplit('#').next().map(str::to_owned);
                }
            }
            return None;
        }
    }
    None
}

fn git(checkout: &Path, args: &[&str]) -> Result<std::process::Output, String> {
    std::process::Command::new("git")
        .arg("-C")
        .arg(checkout)
        .args(args)
        .output()
        .map_err(|e| format!("cannot run git in {}: {e}", checkout.display()))
}

fn attest(checkout: &Path) -> Result<(), String> {
    let root = repo_root();

    let provenance_path = root.join(PROVENANCE_FILE);
    let provenance = std::fs::read_to_string(&provenance_path).map_err(|e| {
        format!(
            "cannot read {} ({e}); stage a bundle with consume-android-shim first",
            provenance_path.display()
        )
    })?;
    let built_from = provenance
        .lines()
        .find_map(|line| line.strip_prefix("built_from="))
        .ok_or("malformed provenance record: no built_from line")?
        .to_owned();
    if built_from.ends_with("+dirty") {
        return Err(format!(
            "the staged shim was built from a dirty checkout ({built_from}); \
             rebuild it from a clean pinned checkout instead of attesting"
        ));
    }

    let lock_text = std::fs::read_to_string(root.join(CARGO_LOCK))
        .map_err(|e| format!("cannot read {CARGO_LOCK}: {e}"))?;
    let pin =
        pinned_rev(&lock_text).ok_or("cannot find the zingolib git revision in Cargo.lock")?;

    if built_from == pin {
        println!("staged shim was built from the pinned revision {pin}; nothing to attest");
        return Ok(());
    }
    if provenance
        .lines()
        .any(|line| line == format!("attested={pin}"))
    {
        println!("pin {pin} is already attested");
        return Ok(());
    }

    for rev in [built_from.as_str(), pin.as_str()] {
        let probe = git(checkout, &["cat-file", "-e", &format!("{rev}^{{commit}}")])?;
        if !probe.status.success() {
            return Err(format!(
                "{} does not contain revision {rev}; fetch it first",
                checkout.display()
            ));
        }
    }

    let diff = git(
        checkout,
        &["diff", "--quiet", &built_from, &pin, "--", SHIM_WORKSPACE],
    )?;
    match diff.status.code() {
        Some(0) => {
            std::fs::write(&provenance_path, format!("{provenance}attested={pin}\n"))
                .map_err(|e| format!("cannot write {}: {e}", provenance_path.display()))?;
            println!(
                "{SHIM_WORKSPACE} is unchanged {built_from}..{pin}; attested the staged shim \
                 for pin {pin}"
            );
            Ok(())
        }
        Some(1) => Err(format!(
            "{SHIM_WORKSPACE} CHANGED between {built_from} and {pin}; the staged shim is \
             stale — rebuild the bundle in zingolib and restage with consume-android-shim"
        )),
        _ => Err(format!(
            "git diff failed: {}",
            String::from_utf8_lossy(&diff.stderr).trim()
        )),
    }
}

fn main() {
    let result = parse_zingolib_arg().and_then(|checkout| attest(&checkout));
    if let Err(message) = result {
        eprintln!("attest-android-shim: {message}");
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pinned_rev_reads_the_lockfile_entry() {
        let lock = "[[package]]\nname = \"zingolib\"\nversion = \"5.0.0\"\n\
                    source = \"git+https://github.com/zingolabs/zingolib?branch=b#abc123\"\n";
        assert_eq!(pinned_rev(lock).as_deref(), Some("abc123"));
    }

    #[test]
    fn pinned_rev_rejects_a_lockfile_without_zingolib() {
        assert_eq!(pinned_rev("[[package]]\nname = \"other\"\n"), None);
    }
}
