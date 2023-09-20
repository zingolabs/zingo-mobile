use bollard::container::{
    Config, CreateContainerOptions, LogsOptions, RemoveContainerOptions, StartContainerOptions,
};
use bollard::models::HostConfig;
use bollard::Docker;
use futures::StreamExt;
use std::default::Default;
use std::process::Command;

pub async fn launch_regchest() -> Docker {
    let docker = Docker::connect_with_local_defaults().unwrap();

    let container_options = Some(CreateContainerOptions {
        name: "regchest",
        platform: None,
    });

    let host_config = HostConfig {
        network_mode: Some(String::from("host")),
        ..Default::default()
    };

    let container_config = Config {
        image: Some("zingodevops/regchest:001"),
        host_config: Some(host_config),
        ..Default::default()
    };

    match docker
        .create_container(container_options, container_config)
        .await
    {
        Ok(_) => println!("Regchest container created successfully"),
        Err(e) => println!("Failed to create regchest container: {}", e),
    }

    match docker
        .start_container("regchest", None::<StartContainerOptions<String>>)
        .await
    {
        Ok(_) => println!("Regchest container started successfully"),
        Err(e) => println!("Failed to start regchest container: {}", e),
    }

    let logs_options = Some(LogsOptions::<String> {
        stdout: true,
        follow: true,
        ..Default::default()
    });

    let mut stream = docker.logs("regchest", logs_options);

    while let Some(result) = stream.next().await {
        match result {
            Ok(message) => {
                let m = &message.into_bytes();
                let s = std::str::from_utf8(m).unwrap();
                if s.contains("Successfully launched regtest environment!") {
                    println!("Success message received, exiting loop.");
                    break;
                }
            }
            Err(_) => {
                println!("Error in stream, exiting loop.");
                break;
            }
        }
    }

    docker
}

pub async fn close_regchest(docker: Docker) {
    let remove_options = Some(RemoveContainerOptions {
        force: true,
        ..Default::default()
    });

    match docker.remove_container("regchest", remove_options).await {
        Ok(_) => println!("Regchest container removed successfully"),
        Err(e) => println!("Failed to remove regchest container: {}", e),
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
