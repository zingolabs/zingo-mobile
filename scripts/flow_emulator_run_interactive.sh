#!/bin/bash
set -e

cd $(git rev-parse --show-toplevel)

./scripts/kill_emulators.sh

./scripts/emulator_boot.sh

./scripts/emulator_install_apk.sh

./scripts/emulator_launch_app.sh

