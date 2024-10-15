use std::{
    io::{BufRead, BufReader},
    process::{Command, Stdio},
    sync::{Arc, Mutex},
    thread::spawn,
};

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
    let mut child = Command::new(command)
        .arg(arg)
        .arg(format!(
            r#"
            cd $(git rev-parse --show-toplevel)
            ./scripts/integration_tests.sh -a {} -e {}
            "#,
            abi, test_name
        ))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("Failed to execute command");

    // Take stdout and stderr before calling wait
    let stdout = child.stdout.take().expect("Failed to capture stdout");
    let stderr = child.stderr.take().expect("Failed to capture stderr");

    // Shared buffer to collect stdout
    let stdout_buf = Arc::new(Mutex::new(String::new()));
    let stdout_buf_clone = Arc::clone(&stdout_buf);

    // Shared buffer to collect stderr
    let stderr_buf = Arc::new(Mutex::new(String::new()));
    let stderr_buf_clone = Arc::clone(&stderr_buf);

    // Spawn thread to read stdout
    let stdout_thread = spawn(move || {
        let stdout_reader = BufReader::new(stdout);
        for line in stdout_reader.lines() {
            let line = line.expect("Could not read stdout line");
            println!("{}", &line); // Print in real time
            stdout_buf_clone.lock().unwrap().push_str(&line);
            stdout_buf_clone.lock().unwrap().push('\n');
        }
    });

    // Spawn thread to read stderr
    let stderr_thread = spawn(move || {
        let stderr_reader = BufReader::new(stderr);
        for line in stderr_reader.lines() {
            let line = line.expect("Could not read stderr line");
            eprintln!("stderr: {}", &line); // Print in real time
            stderr_buf_clone.lock().unwrap().push_str(&line);
            stderr_buf_clone.lock().unwrap().push('\n');
        }
    });

    // Now that stdout and stderr are taken, it's safe to call `wait`
    let status = child.wait().expect("Failed to wait on child");

    // Wait for threads to finish collecting stdout and stderr
    stdout_thread.join().expect("Failed to join stdout thread");
    stderr_thread.join().expect("Failed to join stderr thread");

    let exit_code = status.code().unwrap_or(-1); // Return exit code (-1 if none)
    let stdout = Arc::try_unwrap(stdout_buf).unwrap().into_inner().unwrap();
    let stderr = Arc::try_unwrap(stderr_buf).unwrap().into_inner().unwrap();

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

    let exit_code = output.status.code().unwrap_or(-1);
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    (exit_code, stdout, stderr)
}
