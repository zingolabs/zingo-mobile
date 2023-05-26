#!/bin/bash
set -e

cd "`git rev-parse --show-toplevel`"

#prerequisites:
#> docker
#> sdkmanager (android command line tools, needs accept licenses)

./scripts/emulator_target.sh $@

./scripts/emulator_dependencies.sh

./scripts/emulator_create.sh

