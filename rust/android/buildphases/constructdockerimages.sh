#! /usr/bin/env bash

# build docker images
docker build --target apt_upgrade_rustndk_image . \
&& docker build --target rustndk_openssl_installed_image --tag devlocal/rustndk_openssl_installed_image \
 --build-arg UID=`id -u` \
 --build-arg GUID=`id -g` \
 .
