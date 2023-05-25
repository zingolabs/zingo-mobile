#!/bin/bash
set -e

#prerequisites:
#> docker
#> sdkmanager (android command line tools, needs accept licenses)

./scripts/flow_emulator_setup.sh $@

./scripts/build_apk.sh

./scripts/flow_emulator_run_apk.sh
