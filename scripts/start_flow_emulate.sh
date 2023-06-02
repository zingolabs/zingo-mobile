#!/bin/bash
set -e

cd $(git rev-parse --show-toplevel)

#extra prerequisites:
#> emulator must be already installed

./scripts/build_apk.sh

./scripts/emulator_target.sh $@

./scripts/flow_emulator_run_interactive.sh

