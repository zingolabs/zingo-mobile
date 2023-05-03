#!/bin/bash

# Setup working directory
if [ ! -d "./android/app" ]; then
    echo "Failed. Run './scripts/integration_tests_gradle.sh' from zingo-mobile root directory."
    exit 1
fi
cd android

# Run gradle managed devices integration test
./gradlew x86_ArchsGroupDebugAndroidTest \
-Pandroid.testoptions.manageddevices.emulator.gpu=host \
-Pandroid.testInstrumentationRunnerArguments.class=org.ZingoLabs.Zingo.IntegrationTestSuite
