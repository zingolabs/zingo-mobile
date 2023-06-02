#!/bin/bash
set -e

cd $(git rev-parse --show-toplevel)

#extra prerequisites:
#> target emulator must be already installed

./scripts/rust_build_yarn_install.sh

./scripts/emulator_target.sh $@

./scripts/flow_emulator_run_interactive.sh
