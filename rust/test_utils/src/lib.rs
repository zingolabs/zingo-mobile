use run_script::ScriptOptions;

pub fn run_integration_test() -> (i32, String, String) {
    let options = ScriptOptions::new();
    let args = vec![];

    let (exit_code, output, error) = run_script::run(
        r#"
         cd $(git rev-parse --show-toplevel)
         ./scripts/integration_tests.sh -a x86_64
         "#,
        &args,
        &options,
    )
    .unwrap();

    (exit_code, output, error)
}
