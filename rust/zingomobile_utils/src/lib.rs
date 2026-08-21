#![forbid(unsafe_code)]

pub mod socks5_standin;

use std::process::Command;

/// Runs one on-device instrumented test class.
///
/// `activation_heights` is the launched regtest chain's schedule in the
/// harness's `key=height` spec form; `None` when the chain provisioner
/// cannot report one (regchest). The script forwards it to the device as
/// an instrumentation argument, from which the Kotlin side builds the
/// wallet's `regtest:<schedule>` chain hint — so the wallet's schedule is
/// derived from the chain that was actually launched, never assumed.
pub fn android_integration_test(
    abi: &str,
    test_name: &str,
    activation_heights: Option<&str>,
) -> (i32, String, String) {
    let command: String;
    let arg: String;
    #[cfg(unix)]
    {
        command = "sh".to_string();
        arg = "-c".to_string();
    }

    #[cfg(windows)]
    {
        command = "cmd".to_string();
        arg = "/C".to_string();
    }

    let mut process = Command::new(command);
    process.arg(arg);
    if let Some(heights) = activation_heights {
        process.env("ACTIVATION_HEIGHTS", heights);
    }

    #[cfg(not(any(target_arch = "arm", target_arch = "aarch64")))]
    let output = process
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/android_integration_tests.sh -a {abi} -e {test_name}
            "#
        ))
        .output()
        .expect("Failed to execute command");

    #[cfg(any(target_arch = "arm", target_arch = "aarch64"))]
    let output = process
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/android_integration_tests.sh -a {} -e {} -A
            "#,
            abi, test_name
        ))
        .output()
        .expect("Failed to execute command");

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    (exit_code, stdout, stderr)
}

/// CI variant of [`android_integration_test`]; same activation-heights
/// contract.
pub fn android_integration_test_ci(
    abi: &str,
    test_name: &str,
    activation_heights: Option<&str>,
) -> (i32, String, String) {
    let command: String;
    let arg: String;
    #[cfg(unix)]
    {
        command = "sh".to_string();
        arg = "-c".to_string();
    }

    #[cfg(windows)]
    {
        command = "cmd".to_string();
        arg = "/C".to_string();
    }

    let mut process = Command::new(command);
    process.arg(arg);
    if let Some(heights) = activation_heights {
        process.env("ACTIVATION_HEIGHTS", heights);
    }

    let output = process
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/ci/android_integration_tests_ci.sh -a {abi} -e {test_name}
            "#
        ))
        .output()
        .expect("Failed to execute command");

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    (exit_code, stdout, stderr)
}

pub fn ios_integration_test(test_name: &str) -> (i32, String, String) {
    let command: String;
    let arg: String;
    {
        command = "sh".to_string();
        arg = "-c".to_string();
    }

    let output = Command::new(command)
        .arg(arg)
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/ios_integration_tests.sh -e {test_name}
            "#
        ))
        .output()
        .expect("Failed to execute command");

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    (exit_code, stdout, stderr)
}

pub fn ios_integration_test_ci(test_name: &str) -> (i32, String, String) {
    let command: String;
    let arg: String;
    {
        command = "sh".to_string();
        arg = "-c".to_string();
    }

    let output = Command::new(command)
        .arg(arg)
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/ci/ios_integration_tests_ci.sh -e {test_name}
            "#
        ))
        .output()
        .expect("Failed to execute command");

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    (exit_code, stdout, stderr)
}

pub fn android_e2e_test(abi: &str, test_name: &str) -> (i32, String, String) {
    let command: String;
    let arg: String;
    #[cfg(unix)]
    {
        command = "sh".to_string();
        arg = "-c".to_string();
    }

    #[cfg(windows)]
    {
        command = "cmd".to_string();
        arg = "/C".to_string();
    }

    #[cfg(not(any(target_arch = "arm", target_arch = "aarch64")))]
    let output = Command::new(command)
        .arg(arg)
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/e2e_tests.sh -a {abi} -e {test_name}
            "#
        ))
        .output()
        .expect("Failed to execute command");

    #[cfg(any(target_arch = "arm", target_arch = "aarch64"))]
    let output = Command::new(command)
        .arg(arg)
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/e2e_tests.sh -a {} -e {} -A
            "#,
            abi, test_name
        ))
        .output()
        .expect("Failed to execute command");

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    (exit_code, stdout, stderr)
}

pub fn android_e2e_test_ci(abi: &str, test_name: &str) -> (i32, String, String) {
    let command: String;
    let arg: String;
    #[cfg(unix)]
    {
        command = "sh".to_string();
        arg = "-c".to_string();
    }

    #[cfg(windows)]
    {
        command = "cmd".to_string();
        arg = "/C".to_string();
    }

    let output = Command::new(command)
        .arg(arg)
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/ci/e2e_tests_ci.sh -a {abi} -e {test_name}
            "#
        ))
        .output()
        .expect("Failed to execute command");

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    (exit_code, stdout, stderr)
}
