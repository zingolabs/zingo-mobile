FROM ubuntu:22.04 as android-stage

# Install Android SDK tools and Java (required for Android SDK)
RUN apt-get update && \
    apt-get install -y openjdk-17-jdk wget unzip && \
    wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip -O cmdline-tools.zip && \
    mkdir -p /usr/local/android-sdk/cmdline-tools/latest && \
    unzip cmdline-tools.zip -d /usr/local/android-sdk/cmdline-tools/latest && \
		mv /usr/local/android-sdk/cmdline-tools/latest/cmdline-tools/* /usr/local/android-sdk/cmdline-tools/latest/ && \
    rm -rf /usr/local/android-sdk/cmdline-tools/latest/cmdline-tools && \
    rm cmdline-tools.zip

# Set environment variables for Android SDK
ENV ANDROID_HOME=/usr/local/android-sdk
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$CARGO_HOME/bin:/usr/local/bin

RUN ls -l /usr/local/android-sdk/cmdline-tools/latest/bin

# Accept licenses and install basic Android SDK components
RUN yes | sdkmanager --licenses && \
    sdkmanager "platform-tools" "build-tools;30.0.3" "platforms;android-30"

# Verify Android SDK installation
RUN sdkmanager --version

# Install Node.js
FROM node:20 as node-stage

# Install necessary dependencies for Node.js environment
WORKDIR /home

# Verify Node.js installation
RUN node -v
RUN npm -v
RUN corepack enable
RUN yarn --version

# Install Rust and Nextest
FROM docker.io/rust:latest as rust-stage

# Install cargo-nextest
RUN cargo install cargo-nextest

# Verify Rust and Nextest installation
RUN rustc --version
RUN cargo --version
RUN which cargo
RUN which rustc
RUN cargo nextest --version

# Combine all dependencies in one image
FROM ubuntu:22.04

# Install essential dependencies like build tools
RUN apt-get update -y && apt-get install -y build-essential curl git unzip openjdk-17-jdk net-tools iproute2 libssl-dev pkg-config

# Copy Node.js from the node-stage
COPY --from=node-stage /usr/local /usr/local

# Copy Rust and Nextest from the rust-stage
COPY --from=rust-stage /usr/local/cargo /usr/local/cargo

# Copy Android SDK from android-stage
COPY --from=android-stage /usr/local/android-sdk /usr/local/android-sdk

# Set environment variables for Android SDK
ENV CARGO_HOME=/usr/local/cargo
ENV ANDROID_HOME=/usr/local/android-sdk
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:/usr/local/bin:$CARGO_HOME/bin:/usr/local/bin

ENV UID=1000
ENV GID=1000

# Update the package list, install sudo, create a non-root user, and grant password-less sudo permissions
RUN apt update && \
    apt install -y sudo && \
    addgroup --gid $GID myuser && \
    adduser --uid $UID --gid $GID --disabled-password --gecos "" myuser && \
    echo 'myuser ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers

RUN mkdir -p /app

RUN chown myuser:myuser -R /app
RUN chown myuser:myuser -R /usr/local
RUN chown myuser:myuser -R /home

USER myuser

# Verify all components
RUN node -v
RUN npm -v
RUN rustup default nightly
RUN rustc --version
RUN cargo nextest --version
RUN sdkmanager --list

EXPOSE 8081

WORKDIR /app

# Default command
CMD ["bash"]