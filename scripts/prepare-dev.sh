set -e

sed -i '' 's/com.example.video/com.example.video_dev/' app.config.ts
sed -i '' "s/name: 'silTube'/name: 'silTube (dev)'/" app.config.ts
yes | bun expo prebuild -p android --clean --no-install
sed -i '' 's/release {/release {\
            signingConfig signingConfigs.debug/' android/app/build.gradle
