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

XCTESTRUN=$(find build/DerivedData/Build/Products -name "*.xctestrun" | head -n1)

# just run the test
xcodebuild test-without-building \
  -xctestrun "$XCTESTRUN" \
  -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
  -resultBundlePath "build/reports/ZingoMobile-Test.xcresult" \
  -only-testing:"${test_name}" | xcpretty -c

if [ $? -ne 0 ]; then
    echo -e "\nIntegration tests FAILED"

    exit 1
fi

echo -e "\nIntegration tests PASSED"
