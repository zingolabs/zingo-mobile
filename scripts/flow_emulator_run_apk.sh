#!/bin/bash
set -e

cd "`git rev-parse --show-toplevel`"

./scripts/emulator_run.sh

./scripts/emulator_install_apk.sh

./scripts/emulator_launch_app.sh

