use bollard::container::*;
// use bollard::models::*;
use bollard::Docker;
use std::default::Default;
use std::process::Command;
// use tokio::runtime::Runtime;
use futures::{stream, StreamExt};

pub async fn launch_regchest() {
    let docker = Docker::connect_with_local_defaults().unwrap();

    let container_options = Some(CreateContainerOptions {
        name: "regchest",
        platform: None,
    });

    let config = bollard::container::Config {
        image: Some("zingodevops/regchest:001"),
        cmd: None,
        ..Default::default()
    };

    match docker.create_container(container_options, config).await {
        Ok(_) => println!("Regchest container created successfully"),
        Err(e) => println!("Failed to create container: {}", e),
    }

    match docker
        .start_container("regchest", None::<StartContainerOptions<String>>)
        .await
    {
        Ok(_) => println!("Regchest container started successfully"),
        Err(e) => println!("Failed to start container: {}", e),
    }

    let logs_options = LogsOptions {
        stdout: true,
        // follow: true,
        ..Default::default()
    };

    let mut stream = docker.logs("regchest", Some(logs_options));

    while let Some(result) = stream.next().await {
        match result {
            Ok(msg) if msg.contains("success") => {
                println!("Success message received, exiting loop.");
                break;
            }
            Ok(_) => {}
            Err(_) => {
                println!("Error in stream, exiting loop.");
                break;
            }
        }
    }
}

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
