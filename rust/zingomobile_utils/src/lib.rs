use std::process::Command;

pub fn android_integration_test(abi: &str, test_name: &str) -> (i32, String, String) {
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
            ./scripts/integration_tests.sh -a {} -e {}
            "#,
            abi, test_name
        ))
        .output()
        .expect("Failed to execute command");

    #[cfg(any(target_arch = "arm", target_arch = "aarch64"))]
    let output = Command::new(command)
        .arg(arg)
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/integration_tests.sh -a {} -e {} -A
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

pub fn android_integration_test_ci(abi: &str, test_name: &str) -> (i32, String, String) {
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
            ./scripts/ci/integration_tests_ci.sh -a {} -e {}
            "#,
            abi, test_name
        ))
        .output()
        .expect("Failed to execute command");

    #[cfg(any(target_arch = "arm", target_arch = "aarch64"))]
    let output = Command::new(command)
        .arg(arg)
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/ci/integration_tests_ci.sh -a {} -e {} -A
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
            ./scripts/e2e_tests.sh -a {} -e {}
            "#,
            abi, test_name
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

    #[cfg(not(any(target_arch = "arm", target_arch = "aarch64")))]
    let output = Command::new(command)
        .arg(arg)
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/ci/e2e_tests_ci.sh -a {} -e {}
            "#,
            abi, test_name
        ))
        .output()
        .expect("Failed to execute command");

    #[cfg(any(target_arch = "arm", target_arch = "aarch64"))]
    let output = Command::new(command)
        .arg(arg)
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/ci/e2e_tests_ci.sh -a {} -e {} -A
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
