 The following is required to successfully update the rust android builder image:
 - make neccessary changes to `rust/android/builder/Dockerfile` 
 - change to the `rust/android/builder` directory
 - run `docker build -t zingodevops/android_builder:<new image version number> .` to build the image locally 
 - run `docker login` and fill in the credentials for DockerHub
 - run `docker push zingodevops/android_builder:<new image version number>' to push to DockerHub
 - update the first line of `rust/Dockerfile` to the new image version number
 - update the files in `.github/workflows/` directory to the new image version number

