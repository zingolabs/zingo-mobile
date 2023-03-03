#! /usr/bin/env bash

sdkmanager --install "system-images;android-29;google_apis_playstore;x86"
sdkmanager --install "system-images;android-30;google_apis;x86_64"

avdmanager create avd --name 29_gaps_32 --package 'system-images;android-29;google_apis_playstore;x86'
avdmanager create avd --name 30_ga_64 --package 'system-images;android-30;google_apis;x86_64'

