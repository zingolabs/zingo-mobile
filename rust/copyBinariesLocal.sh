#! /usr/bin/env bash

id=$(docker create zingodevops/regchest:009)

docker cp \
    $id:/usr/bin/lightwalletd \
    ./test_binaries/bins
docker cp \
    $id:/usr/bin/zcashd \
    ./test_binaries/bins
docker cp \
    $id:/usr/bin/zcash-cli \
    ./test_binaries/bins

docker rm -v $id