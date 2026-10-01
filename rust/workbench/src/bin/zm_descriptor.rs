#![forbid(unsafe_code)]

use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};

/// The prefix of a zingo-mobile release tag.
const TAG_PREFIX: &str = "zingo-";

/// The zingo-mobile checkout, two directories above this crate's manifest.
fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("the workbench crate sits at rust/workbench")
        .to_path_buf()
}

/// The trimmed stdout of a git command in the checkout that succeeded with output.
fn git_stdout(root: &Path, args: &[&str]) -> Option<String> {
    Command::new("git")
        .arg("-C")
        .arg(root)
        .args(args)
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|stdout| stdout.trim_end().to_string())
        .filter(|stdout| !stdout.is_empty())
}

/// The highest release tag that points at HEAD, which a depth-one fetch with tags carries.
fn tag_at_head(root: &Path) -> Option<String> {
    git_stdout(
        root,
        &[
            "tag",
            "--points-at",
            "HEAD",
            "--list",
            &format!("{TAG_PREFIX}*"),
            "--sort=-version:refname",
        ],
    )
    .and_then(|tags| tags.lines().next().map(str::to_string))
}

/// The five-character abbreviation of HEAD.
fn hash5(root: &Path) -> Option<String> {
    git_stdout(root, &["rev-parse", "HEAD"]).map(|hash| hash.chars().take(5).collect())
}

/// Whether a tracked file differs from HEAD, as `git describe --dirty` judges it.
fn dirty(root: &Path) -> bool {
    Command::new("git")
        .arg("-C")
        .arg(root)
        .args(["diff-index", "--quiet", "HEAD", "--"])
        .status()
        .map(|status| !status.success())
        .unwrap_or(false)
}

/// The `version` field of the checkout's package.json.
fn package_version(root: &Path) -> Result<String, String> {
    let manifest = root.join("package.json");
    let text = std::fs::read_to_string(&manifest)
        .map_err(|e| format!("cannot read {}: {e}", manifest.display()))?;
    let package: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("{} is not JSON: {e}", manifest.display()))?;
    package["version"]
        .as_str()
        .map(str::to_string)
        .ok_or_else(|| format!("{} has no string version", manifest.display()))
}

/// `zm_<tag#>` on a release tag, else `zm_<ver>_<hash5>`, with `_dirty` for a modified tree.
fn descriptor(tag: Option<&str>, version: &str, hash5: Option<&str>, dirty: bool) -> String {
    let formatted = match (tag, hash5) {
        (Some(tag), _) => format!("zm_{}", tag.strip_prefix(TAG_PREFIX).unwrap_or(tag)),
        (None, Some(hash5)) => format!("zm_{version}_{hash5}"),
        (None, None) => format!("zm_{version}"),
    };
    if dirty {
        format!("{formatted}_dirty")
    } else {
        formatted
    }
}

fn main() -> ExitCode {
    let root = repo_root();
    match package_version(&root) {
        Ok(version) => {
            println!(
                "{}",
                descriptor(
                    tag_at_head(&root).as_deref(),
                    &version,
                    hash5(&root).as_deref(),
                    dirty(&root),
                )
            );
            ExitCode::SUCCESS
        }
        Err(message) => {
            eprintln!("zm-descriptor: {message}");
            ExitCode::FAILURE
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Tests that the release form omits the hash when a release tag points at HEAD.
    #[test]
    fn a_release_tag_gives_the_release_form() {
        assert_eq!(
            descriptor(Some("zingo-2.0.24-320"), "2.0.24", Some("f3d1a"), false),
            "zm_2.0.24-320"
        );
    }

    /// Tests that the package version and the hash name a build off any tag.
    #[test]
    fn no_tag_gives_the_version_and_the_hash() {
        assert_eq!(
            descriptor(None, "2.0.24", Some("8c2cf"), false),
            "zm_2.0.24_8c2cf"
        );
    }

    /// Tests that a modified tree appends the dirty marker to either form.
    #[test]
    fn a_modified_tree_appends_dirty() {
        assert_eq!(
            descriptor(Some("zingo-beta-2.0.23-335"), "2.0.24", None, true),
            "zm_beta-2.0.23-335_dirty"
        );
        assert_eq!(descriptor(None, "2.0.24", None, true), "zm_2.0.24_dirty");
    }
}
