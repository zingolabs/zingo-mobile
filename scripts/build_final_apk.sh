#!/bin/bash
set -e

cd $(git rev-parse --show-toplevel)

./scripts/rust_build_yarn_install.sh
yarn
yarn build:bundle

