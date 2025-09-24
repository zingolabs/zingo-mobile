#!/bin/bash
set -Eeuo pipefail

set_test_name=false
test_name_default="ZingoMobileTests/OfflineTestSuite"

while getopts 'a:e:x:h' OPTION; do
    case "$OPTION" in
        e)
            test_name="$OPTARG"
            set_test_name=true
            ;;
        h)
            echo -e "\nRun integration tests. Requires iOS Command-line Tools."
            echo -e "\n  -e\t\tSelect test name or test suite (optional)"
            echo -e "      \t\t  Default: ZingoMobileTests/OfflineTestSuite"
            exit 1
            ;;
        ?)
            echo "Try '$(basename $0) -h' for more information." >&2
            exit 1
            ;;
    esac
done
# Set defaults
if [[ $set_test_name == false ]]; then
    test_name=$test_name_default
fi

# Setup working directory
if [ ! -d "./ios" ]; then
    echo "Error: Incorrect working directory" >&2
    echo "Try './scripts/$(basename $0)' from zingo-mobile root directory." >&2
    exit 1
fi

cd ios

rm -rf build/reports
rm -rf build/DerivedData
mkdir -p build/reports build/DerivedData

xcodebuild test \
    -workspace ZingoMobile.xcworkspace \
    -scheme ZingoMobile \
    -sdk iphonesimulator \
    -configuration Debug \
    -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
    -derivedDataPath "build/DerivedData" \
    -resultBundlePath "build/reports/ZingoMobile-Test.xcresult" \
    -only-testing:"${test_name}"

if [ $? -ne 0 ]; then
    echo -e "\nIntegration tests FAILED"

    exit 1
fi

echo -e "\nIntegration tests PASSED"
