#! /usr/bin/env bash

# build docker image
docker build --target build_android --tag devlocal/build_android \
 --build-arg UID=`id -u` \
 --build-arg GUID=`id -g` \
 .
