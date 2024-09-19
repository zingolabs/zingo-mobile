# Base image - Alpine for all stages
FROM alpine:3.18 AS base

# Global environment variables
ENV ANDROID_HOME="/usr/local/android-sdk" \
    JAVA_HOME="/usr/lib/jvm/default-jvm" \
    ANDROID_SDK_TOOLS="https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip" \
    ANDROID_SDK_ZIP="sdk-tools.zip"
# Define environment variables for key Android and Java paths
ENV ANDROID_CMD_TOOLS=${ANDROID_HOME}/cmdline-tools/latest/bin \
    ANDROID_PLATFORM_TOOLS=${ANDROID_HOME}/platform-tools \
    ANDROID_EMULATOR=${ANDROID_HOME}/emulator \
    JAVA_BIN=$JAVA_HOME/bin
# Update the PATH
ENV PATH="${ANDROID_CMD_TOOLS}:${ANDROID_PLATFORM_TOOLS}:${ANDROID_EMULATOR}:${JAVA_BIN}:${PATH}"

# Common dependencies across all stages
RUN apk add --no-cache bash curl git libstdc++ build-base python3 libc6-compat dumb-init

# Install development tools and packages for building
RUN apk add --no-cache \
    openjdk17-jdk \
    nodejs \
    npm \
    rust \
    git \
    cargo
    # kotlin \
    # gradle

# Install pnpm globally (instead of npm for caching node_modules)
RUN npm install -g yarn

# Install Android SDK and tools
RUN mkdir -p ${ANDROID_HOME} && \
    curl -o ${ANDROID_SDK_ZIP} ${ANDROID_SDK_TOOLS} && \
    unzip ${ANDROID_SDK_ZIP} -d ${ANDROID_HOME}/cmdline-tools && \
    mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest && \
    rm ${ANDROID_SDK_ZIP}

RUN yes | ${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager --licenses && \
    ${ANDROID_CMD_TOOLS}/sdkmanager "platform-tools" "platforms;android-30" "build-tools;30.0.3" "emulator" \
    "system-images;android-30;google_apis;x86_64" 

# Create Android AVD for Pixel 2 (API 30) and avoid remounting
RUN echo "no" | avdmanager create avd -n Pixel_2_API_30 -k "system-images;android-30;google_apis;x86_64" --device "pixel_2"

# Install development tools and packages for building
RUN apk add --no-cache nodejs npm docker

# Install pnpm globally (instead of npm for caching node_modules)
RUN npm install -g pnpm

# Clone the Zingo Mobile repository
RUN git clone https://github.com/zingolabs/zingo-mobile.git

# Set working directory
WORKDIR /zingo-mobile
RUN pnpm install

# Install emulator dependencies and prepare the AVD for testing
RUN apk add --no-cache bash libstdc++

# Mount volume to persist AVD state across test runs
VOLUME /root/.android/avd

# Expose the port for React Native server
EXPOSE 8081

# Command to start the React Native server for testing
CMD ["pnpn", "start"]
