#!/bin/bash
# set -e

cd $(git rev-parse --show-toplevel)

#extra prerequisites:
#> target emulator must be already installed

test_suite=$1
shift

./scripts/rust_build_yarn_install.sh

./scripts/flow_emulator_setup.sh $@

./scripts/flow_test_e2e.sh $test_suite
