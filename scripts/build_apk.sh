#!/bin/bash

echo "/nBuilding native rust..."
cd rust
./build.sh
cd ..

echo -e "\nRunning yarn install..."
yarn install

echo -e "\nBuilding APKs..."
cd android
./gradlew assembleDebug -Psplitapk=true
cd ..

