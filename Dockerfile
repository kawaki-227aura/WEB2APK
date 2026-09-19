FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive ANDROID_HOME=/opt/android-sdk ANDROID_SDK_ROOT=/opt/android-sdk PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:/opt/gradle/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk wget unzip curl ca-certificates imagemagick nodejs npm && rm -rf /var/lib/apt/lists/*
RUN mkdir -p $ANDROID_HOME/cmdline-tools && wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/c.zip && unzip -q /tmp/c.zip -d $ANDROID_HOME/cmdline-tools && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest && yes | sdkmanager --licenses >/dev/null 2>&1 || true && sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" && rm /tmp/c.zip
RUN wget -q https://services.gradle.org/distributions/gradle-8.9-bin.zip -O /tmp/g.zip && unzip -q /tmp/g.zip -d /opt && ln -s /opt/gradle-8.9 /opt/gradle && rm /tmp/g.zip
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["npm","start"]