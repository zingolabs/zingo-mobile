use std::process::Command;

pub fn android_integration_test(abi: &str, test_name: &str) -> (i32, String, String) {
    #[cfg(not(any(target_arch = "arm", target_arch = "aarch64")))]
    let output = Command::new("sh")
        .arg("-c")
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
    let output = Command::new("sh")
        .arg("-c")
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

pub fn android_e2e_test(test_name: &str) -> (i32, String, String) {
    let output = Command::new("sh")
        .arg("-c")
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            yarn detox build -c android.att.debug
            yarn detox test -c android.att.debug {}
            "#,
            test_name
        ))
        .output()
        .expect("Failed to execute command");

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    (exit_code, stdout, stderr)
}
