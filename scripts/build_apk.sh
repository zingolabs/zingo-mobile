#!/bin/bash
set -e

cd $(git rev-parse --show-toplevel)

echo -e "\nBuilding native rust..."
cd rust
./build.sh
cd ..

echo -e "\nRunning yarn install..."
yarn install

echo -e "\nBuilding APKs..."
cd android
./gradlew assembleDebug -PsplitApk=true
cd ..

