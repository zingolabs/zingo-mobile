#![forbid(unsafe_code)]

//! ci-gate: an artifact gate for GitHub Actions jobs.
//!
//! Blocks until a named artifact exists in the current workflow run, then
//! exits 0. Aborts with exit 1 as soon as every upstream job matching the
//! given name pattern has completed without success (the artifact can no
//! longer appear), or when the deadline passes. This lets a job start at
//! workflow launch and front-load work that does not depend on the
//! artifact, instead of serializing behind the producer with a `needs:`
//! edge. See CONTEXT.md ("Artifact gate").
//!
//! Transport is the `gh` CLI (present on all GitHub-hosted runners,
//! authenticated via GH_TOKEN); the decision logic is pure and unit
//! tested. Both API reads request one page of 100 entries, which is far
//! above the job and artifact count of any run of this repository.

use std::process::Command;
use std::time::{Duration, Instant};

#[derive(Debug, PartialEq, Eq)]
enum GateState {
    /// The wanted artifact exists; the gate opens.
    Ready,
    /// A job matching the upstream pattern completed without success, so
    /// the artifact can never appear. Note that any matching job anywhere
    /// in the run triggers this; under the fail-all policy the run is
    /// being cancelled anyway.
    UpstreamGone { job: String, conclusion: String },
    /// Nothing decisive yet; poll again.
    Waiting,
}

#[derive(Debug, PartialEq, Eq)]
struct UpstreamJob {
    name: String,
    completed: bool,
    conclusion: String,
}

fn assess(artifact_names: &[String], upstream: &[UpstreamJob], wanted: &str) -> GateState {
    if artifact_names.iter().any(|name| name == wanted) {
        return GateState::Ready;
    }
    for job in upstream {
        if job.completed && job.conclusion != "success" {
            return GateState::UpstreamGone {
                job: job.name.clone(),
                conclusion: job.conclusion.clone(),
            };
        }
    }
    GateState::Waiting
}

fn parse_artifact_names(body: &serde_json::Value) -> Vec<String> {
    body["artifacts"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|artifact| artifact["name"].as_str())
        .map(str::to_owned)
        .collect()
}

fn parse_upstream_jobs(body: &serde_json::Value, pattern: &str) -> Vec<UpstreamJob> {
    body["jobs"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|job| {
            job["name"]
                .as_str()
                .is_some_and(|name| name.contains(pattern))
        })
        .map(|job| UpstreamJob {
            name: job["name"].as_str().unwrap_or_default().to_owned(),
            completed: job["status"].as_str() == Some("completed"),
            conclusion: job["conclusion"].as_str().unwrap_or_default().to_owned(),
        })
        .collect()
}

/// Fetches one API page via `gh api`. Returns None on any transport or
/// parse failure so a transient API error reads as "keep waiting".
fn fetch(path: &str) -> Option<serde_json::Value> {
    let output = Command::new("gh").args(["api", path]).output().ok()?;
    if !output.status.success() {
        eprintln!(
            "ci-gate: gh api {path} failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        );
        return None;
    }
    serde_json::from_slice(&output.stdout).ok()
}

struct Config {
    artifact: String,
    upstream: String,
    timeout: Duration,
    poll: Duration,
    repo: String,
    run_id: String,
}

fn parse_args() -> Result<Config, String> {
    let mut artifact = None;
    let mut upstream = None;
    let mut timeout_secs: u64 = 2700;
    let mut poll_secs: u64 = 20;

    let mut args = std::env::args().skip(1);
    while let Some(flag) = args.next() {
        let mut value = |flag: &str| {
            args.next()
                .ok_or_else(|| format!("missing value for {flag}"))
        };
        match flag.as_str() {
            "--artifact" => artifact = Some(value("--artifact")?),
            "--upstream" => upstream = Some(value("--upstream")?),
            "--timeout-secs" => {
                timeout_secs = value("--timeout-secs")?
                    .parse()
                    .map_err(|e| format!("--timeout-secs: {e}"))?
            }
            "--poll-secs" => {
                poll_secs = value("--poll-secs")?
                    .parse()
                    .map_err(|e| format!("--poll-secs: {e}"))?
            }
            other => return Err(format!("unknown flag: {other}")),
        }
    }

    let env = |name: &str| std::env::var(name).map_err(|_| format!("{name} is not set"));
    Ok(Config {
        artifact: artifact.ok_or("--artifact is required")?,
        upstream: upstream.ok_or("--upstream is required")?,
        timeout: Duration::from_secs(timeout_secs),
        poll: Duration::from_secs(poll_secs),
        repo: env("GITHUB_REPOSITORY")?,
        run_id: env("GITHUB_RUN_ID")?,
    })
}

fn main() {
    let config = match parse_args() {
        Ok(config) => config,
        Err(message) => {
            eprintln!("ci-gate: {message}");
            std::process::exit(2);
        }
    };

    let artifacts_path = format!(
        "repos/{}/actions/runs/{}/artifacts?per_page=100",
        config.repo, config.run_id
    );
    let jobs_path = format!(
        "repos/{}/actions/runs/{}/jobs?per_page=100",
        config.repo, config.run_id
    );

    let deadline = Instant::now() + config.timeout;
    println!(
        "ci-gate: waiting up to {}s for artifact \"{}\" (producer: jobs matching \"{}\")",
        config.timeout.as_secs(),
        config.artifact,
        config.upstream
    );

    while Instant::now() < deadline {
        let artifact_names = fetch(&artifacts_path)
            .map(|body| parse_artifact_names(&body))
            .unwrap_or_default();
        let upstream_jobs = fetch(&jobs_path)
            .map(|body| parse_upstream_jobs(&body, &config.upstream))
            .unwrap_or_default();

        match assess(&artifact_names, &upstream_jobs, &config.artifact) {
            GateState::Ready => {
                println!("ci-gate: artifact \"{}\" is ready", config.artifact);
                return;
            }
            GateState::UpstreamGone { job, conclusion } => {
                eprintln!(
                    "ci-gate: upstream job \"{job}\" concluded \"{conclusion}\"; \
                     artifact \"{}\" will never appear",
                    config.artifact
                );
                std::process::exit(1);
            }
            GateState::Waiting => std::thread::sleep(config.poll),
        }
    }

    eprintln!(
        "ci-gate: deadline exceeded waiting for artifact \"{}\"",
        config.artifact
    );
    std::process::exit(1);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn job(name: &str, completed: bool, conclusion: &str) -> UpstreamJob {
        UpstreamJob {
            name: name.to_owned(),
            completed,
            conclusion: conclusion.to_owned(),
        }
    }

    #[test]
    fn artifact_present_opens_the_gate() {
        let artifacts = vec!["android-build-outputs-x86_64-abc".to_owned()];
        let upstream = vec![job("Android APK build", true, "success")];
        assert_eq!(
            assess(&artifacts, &upstream, "android-build-outputs-x86_64-abc"),
            GateState::Ready
        );
    }

    #[test]
    fn artifact_wins_even_if_a_matching_job_failed() {
        // In a matrix, another leg's producer may fail after ours already
        // uploaded; the artifact's existence is the decisive fact.
        let artifacts = vec!["wanted".to_owned()];
        let upstream = vec![job("Android APK build", true, "failure")];
        assert_eq!(assess(&artifacts, &upstream, "wanted"), GateState::Ready);
    }

    #[test]
    fn failed_upstream_aborts() {
        let upstream = vec![job("Android APK build", true, "failure")];
        assert_eq!(
            assess(&[], &upstream, "wanted"),
            GateState::UpstreamGone {
                job: "Android APK build".to_owned(),
                conclusion: "failure".to_owned(),
            }
        );
    }

    #[test]
    fn skipped_upstream_aborts() {
        // A skipped producer (its own dependency failed) also means the
        // artifact can never appear.
        let upstream = vec![job("Android APK build", true, "skipped")];
        assert!(matches!(
            assess(&[], &upstream, "wanted"),
            GateState::UpstreamGone { .. }
        ));
    }

    #[test]
    fn running_upstream_keeps_waiting() {
        let upstream = vec![job("Android APK build", false, "")];
        assert_eq!(assess(&[], &upstream, "wanted"), GateState::Waiting);
    }

    #[test]
    fn absent_upstream_keeps_waiting() {
        // The jobs listing can lag behind scheduling; absence is not
        // evidence of failure.
        assert_eq!(assess(&[], &[], "wanted"), GateState::Waiting);
    }

    #[test]
    fn parses_artifact_names() {
        let body: serde_json::Value = serde_json::json!({
            "artifacts": [{ "name": "a" }, { "name": "b" }]
        });
        assert_eq!(parse_artifact_names(&body), vec!["a", "b"]);
    }

    #[test]
    fn parses_and_filters_jobs_by_pattern() {
        let body: serde_json::Value = serde_json::json!({
            "jobs": [
                { "name": "android-apk-build / Android APK build",
                  "status": "completed", "conclusion": "success" },
                { "name": "jest-test / Jest test",
                  "status": "in_progress", "conclusion": null }
            ]
        });
        let jobs = parse_upstream_jobs(&body, "Android APK build");
        assert_eq!(
            jobs,
            vec![job(
                "android-apk-build / Android APK build",
                true,
                "success"
            )]
        );
    }
}
