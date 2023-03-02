#! /usr/bin/env bash

yarn detox build -c android.emu.32
yarn detox build -c android.emu.64
yarn detox test -c android.emu.32
yarn detox test -c android.emu.64
