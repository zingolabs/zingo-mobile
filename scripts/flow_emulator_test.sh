#!/bin/bash

#prerequisites:
#> docker
#> sdkmanager (android command line tools, needs accept licenses)

./scripts/build_apk.sh

./scripts/flow_emulator_setup.sh $@

./scripts/flow_emulator_run_apk.sh
