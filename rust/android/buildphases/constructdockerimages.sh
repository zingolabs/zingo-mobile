#! /usr/bin/env bash

# build docker images
docker build --tag localrndk/rustndk:latest rustNDKDocker
docker build --tag zecwalletmobile/android:latest docker
