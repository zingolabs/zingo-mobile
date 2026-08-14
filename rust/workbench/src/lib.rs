//! Shared helpers for the workbench tooling crate (one binary per `src/bin/*.rs`).
//!
//! Every tool follows the same shape: resolve something under the repo root,
//! then either print a result or emit one-or-more `"{prog}: {line}"`
//! diagnostics and exit non-zero. [`run`] centralises that `main()` shape;
//! [`repo_root`] and [`git`] are the shared primitives.

#![forbid(unsafe_code)]

use std::path::PathBuf;
use std::process::{exit, Command};

/// Run a tool `body` — the single `main()` shape shared by every binary —
/// reporting diagnostics as `"{prog}: {line}"` to stderr and exiting `1` on
/// error, while on success running `on_ok` (e.g. to print a result) and
/// exiting `0`.
pub fn run<T>(
    prog: &str,
    body: impl FnOnce() -> Result<T, Vec<String>>,
    on_ok: impl FnOnce(T),
) -> ! {
    match body() {
        Ok(value) => {
            on_ok(value);
            exit(0);
        }
        Err(lines) => {
            for line in lines {
                eprintln!("{prog}: {line}");
            }
            exit(1);
        }
    }
}

/// Run `git <args>` and return its stdout, or a one-line diagnostic on failure.
pub fn git(args: &[&str]) -> Result<String, Vec<String>> {
    let output = Command::new("git")
        .args(args)
        .output()
        .map_err(|e| vec![format!("failed to run git: {e}")])?;
    if !output.status.success() {
        return Err(vec![format!("`git {}` failed", args.join(" "))]);
    }
    String::from_utf8(output.stdout).map_err(|e| vec![format!("git output not utf-8: {e}")])
}

/// Repository root via `git rev-parse --show-toplevel`.
pub fn repo_root() -> Result<PathBuf, Vec<String>> {
    Ok(PathBuf::from(git(&["rev-parse", "--show-toplevel"])?.trim()))
}

/// The value of a `--dest <dir>` or `--dest=<dir>` argument, if present.
pub fn parse_dest(args: &[String]) -> Result<Option<PathBuf>, Vec<String>> {
    let mut iter = args.iter();
    while let Some(arg) = iter.next() {
        if let Some(dir) = arg.strip_prefix("--dest=") {
            return Ok(Some(PathBuf::from(dir)));
        }
        if arg == "--dest" {
            let dir = iter
                .next()
                .ok_or_else(|| vec!["--dest requires a directory argument".to_string()])?;
            return Ok(Some(PathBuf::from(dir)));
        }
    }
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_separate_and_joined_dest() {
        let sep = vec![
            "--release".to_string(),
            "--dest".to_string(),
            "/x".to_string(),
        ];
        assert_eq!(parse_dest(&sep).unwrap(), Some(PathBuf::from("/x")));

        let joined = vec!["--dest=/y".to_string()];
        assert_eq!(parse_dest(&joined).unwrap(), Some(PathBuf::from("/y")));
    }

    #[test]
    fn no_dest_is_none() {
        assert_eq!(parse_dest(&["--release".to_string()]).unwrap(), None);
    }

    #[test]
    fn dest_without_value_is_an_error() {
        assert!(parse_dest(&["--dest".to_string()]).is_err());
    }
}
