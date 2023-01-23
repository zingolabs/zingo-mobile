#! /usr/bin/env bash

# android builder image
# upload updated builder images to zingodevops dockerhub
docker build --target apt_upgrade_rustndk_image . \
&& docker build --target rustndk_openssl_installed_image --tag zingodevops/android_builder \
 --build-arg UID=`id -u` \
 --build-arg GUID=`id -g` \
.
