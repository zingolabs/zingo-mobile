use run_script::ScriptOptions;

pub fn run_integration_test(abi: &str, test_name: &str) -> (i32, String, String) {
    let options = ScriptOptions::new();
    let args = vec![abi.to_string(), test_name.to_string()];

    let (exit_code, output, error) = run_script::run(
        r#"
         cd $(git rev-parse --show-toplevel)
         ./scripts/integration_tests.sh -a $1 -e $2
         "#,
        &args,
        &options,
    )
    .unwrap();

    (exit_code, output, error)
}
