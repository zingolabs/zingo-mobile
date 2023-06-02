#!/bin/bash
set -e

cd $(git rev-parse --show-toplevel)

#extra prerequisites:
#> emulator must be already installed

test_suite=$1
shift

./scripts/build_apk.sh

./scripts/emulator_target.sh $@

./scripts/flow_run_e2e.sh $test_suite

