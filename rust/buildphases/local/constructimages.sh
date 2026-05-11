#! /usr/bin/env bash

# build image
podman build --target build_android --tag devlocal/build_android . -f local.Dockerfile
