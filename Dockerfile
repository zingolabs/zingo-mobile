# Use an Arch Linux base image
FROM archlinux:latest

# Install necessary packages
RUN pacman -Syu --noconfirm \
    && pacman -S --noconfirm \
        base-devel \
        git \
        curl \
        nodejs \
        npm \
        yarn \
        rust \
        docker \
        openjdk17 \
        android-sdk \
        android-sdk-platform-tools \
        android-sdk-build-tools \
        android-sdk-cmdline-tools \
        android-ndk \
        && pacman -Scc --noconfirm

# Install cargo-lipo and CocoaPods
RUN cargo install cargo-lipo \
    && gem install cocoapods

# Set environment variables
ENV JAVA_HOME=/usr/lib/jvm/java-18-openjdk \
    ANDROID_HOME=/usr/lib/android-sdk \
    ANDROID_SDK_ROOT=/usr/lib/android-sdk \
    PATH="/usr/lib/android-sdk/cmdline-tools/latest/bin:/usr/lib/android-sdk/platform-tools:$PATH"

# Configure Android SDK and NDK
RUN mkdir -p /root/.android \
    && touch /root/.android/repositories.cfg \
    && sdkmanager --update \
    && sdkmanager "platforms;android-30" "build-tools;30.0.3" "ndk;23.1.7779620"

# Clone the Zingo Mobile repository
RUN git clone https://github.com/zingolabs/zingo-mobile.git /zingo-mobile

# Set working directory
WORKDIR /zingo-mobile

# Install dependencies
RUN yarn install

# Run Android build scripts
RUN cd rust/android && ./build.sh

# Expose ports for development
EXPOSE 8081 8082

# Set up the entry point
ENTRYPOINT ["yarn", "start"]
