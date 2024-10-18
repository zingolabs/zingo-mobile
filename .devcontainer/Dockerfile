# Stage 1: Install Node.js
FROM node:20 as node-stage

# Install necessary dependencies for Node.js environment
WORKDIR /home

# Verify Node.js installation
RUN node -v
RUN npm -v
RUN corepack enable
RUN yarn --version

# Stage 2: Install Rust and Nextest
FROM docker.io/rust:latest as rust-stage

# Install cargo-nextest
RUN cargo install cargo-nextest

# Verify Rust and Nextest installation
RUN rustc --version
RUN cargo --version
RUN which cargo
RUN which rustc
RUN cargo nextest --version

# Stage 3: Install Android command-line tools
FROM ubuntu:latest as android-stage

# Install Android SDK tools and Java (required for Android SDK)
RUN apt update && \
    apt install -y openjdk-17-jdk wget unzip && \
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
# Final Stage: Combine all dependencies in one image
FROM ubuntu:latest

# Install essential dependencies like build tools
RUN apt update -y && apt install -y build-essential curl git unzip openjdk-17-jdk net-tools iproute2 libssl-dev pkg-config

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

# Verify all components
RUN node -v
RUN npm -v
RUN rustup default stable
RUN rustc --version
RUN cargo nextest --version
RUN sdkmanager --list

# Set the working directory
WORKDIR /home

EXPOSE 8081

# Default command
CMD ["bash"]
