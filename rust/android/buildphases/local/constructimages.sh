#! /usr/bin/env bash

# build image
docker build --target build_android --tag localhost/devlocal/build_android . -f android/docker/local.Dockerfile
