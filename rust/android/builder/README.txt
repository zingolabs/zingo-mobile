 The following is required to successfully update the rust android builder image:
 - make necessary changes to `rust/android/builder/Dockerfile`
 - change to the `rust/android/builder` directory
 - run `podman build -t zingodevops/android_builder:<new image version number> .` to build the image locally
 - run `podman login docker.io` and fill in the credentials for DockerHub
 - run `podman push zingodevops/android_builder:<new image version number>` to push to DockerHub
 - update the first line of `rust/android/docker/Dockerfile` and `rust/android/docker/local.Dockerfile` to the new image version number
 - update the files in `.github/workflows/` directory to the new image version number

