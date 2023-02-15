#! /usr/bin/env bash

sh e2e/setup.sh
yarn detox test -c android.emu.debug
killall node
