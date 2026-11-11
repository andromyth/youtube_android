# silTube — Build & Rebuild Guide

This repository snapshot contains the Android TV remote-friendly changes on top
of the upstream 0.6.13 base. The generated native project (`android/`) and the
built injected script (`assets/scripts/main.bjs`) are included even though they
are normally gitignored, so the app can be rebuilt without extra setup.

The tree is debranded. Upstream names, URLs, package IDs, and artwork have been
removed, and the app uses a placeholder identity:

| Item | Placeholder |
| --- | --- |
| Display name | `silTube` |
| Android / iOS package | `com.example.video` |
| Deep-link scheme | `videoapp` |
| Internal code prefix | `VideoApp` / `videoapp` |
| Launcher icon | removed |

## Add your own name, package, and icon later

1. Display name: `app.config.ts` (`name`), `android/app/src/main/res/values/strings.xml`
   (`app_name`), `extension/wxt.config.ts`, `desktop/electron-builder.yml`.
2. Package ID: `app.config.ts` (`android.package`, `ios.bundleIdentifier`),
   `android/app/build.gradle` (`namespace`, `applicationId`), and the Kotlin
   package directory `android/app/src/main/java/com/example/video/`.
3. Deep-link scheme: `app.config.ts` (`scheme`), `android/app/src/main/AndroidManifest.xml`,
   `android/app/src/main/res/values/strings.xml` (`share_into_scheme`).
4. Icon: add `assets/images/icon.png` (1024×1024), an adaptive foreground and
   monochrome image, then restore the `icon` / `android.adaptiveIcon` entries in
   `app.config.ts`, or place launcher assets under
   `android/app/src/main/res/mipmap-*` and restore `android:icon` /
   `android:roundIcon` in `AndroidManifest.xml`. The launcher currently falls
   back to the system default icon.

## TV changes in this snapshot

| Area | File(s) | What it does |
| --- | --- | --- |
| TV CSS | `content/css-tv.ts`, `content/css.ts` | 4-column home grid, hides the bottom Home/Shorts/You bar and the category chip row, compacts the mobile masthead |
| Remote navigation | `content/remote-navigation.ts` | D-pad focus, tile-first OK activation, search-input submit, search-suggestion focus/activation, page marker for CSS scoping, `player-key` bridge |
| Fullscreen | `content/main.ts`, `content/split-view.ts` | Exposes `window.VideoApp.setNativeFullscreen`; applies the fullscreen layout/CSS |
| Player controls | `components/page/PlayerFrame.tsx`, `states/ui.ts` | Auto-hiding bottom control bar (Play/Pause, ±10 s, Quality, Speed, Mini, Close) |
| TV shell | `components/page/MainPageContent.tsx`, `lib/utils.ts`, `lib/split-view.ts` | Sets `window.VideoAppTV`, hides the native header on TV, forces full player mode |
| TV gate | `content/types.ts` | Declares `window.VideoAppTV` |

The page marker is `document.documentElement.dataset.videoPage`
(`home` / `results` / `watch` / `other`), refreshed by
`content/remote-navigation.ts`. The dense grid rules are scoped to
`html[data-video-page='home']`.

## Requirements

- Node.js **22.x** (Node 18 breaks Metro: `configs.toReversed`)
- `bun` (or npm)
- Android SDK + JDK 17+ for a Gradle build
- `adb` for install/verification
- `zipalign` and `apksigner` from Android build-tools for the APK-patch path

## Install dependencies

```sh
bun install
# or
npm install
```

## Build the injected content script

```sh
npx esbuild --bundle content/main.ts --minify --outfile=assets/scripts/main.bjs
```

This script contains the TV CSS, remote navigation, and the fullscreen bridge.
It is read at runtime from the app's asset bundle.

## Type-check

```sh
npx tsc --noEmit
```

## Build the APK in GitHub Actions

`.github/workflows/build-apk.yml` builds the release APK on every push to
`main`, or manually via **Actions → Build TV APK → Run workflow**. Each run
uploads a `tv-apk` artifact and creates a `tv-build-<run>` release with the
per-ABI APKs.

- The release variant is signed with the checked-in
  `android/app/debug.keystore`, so the artifact installs directly. Replace it
  with a private keystore before publishing.
- Install the APK matching the TV's ABI: `app-armeabi-v7a-release.apk` for
  32-bit devices, `app-arm64-v8a-release.apk` for 64-bit ones.

## Build the Android app (native)

The `android/` directory is included. Normally Expo generates it with
`npx expo prebuild`; it is gitignored upstream.

```sh
npx expo run:android --variant release
```

If Gradle fails because the NDK/CMake is missing, use the APK-patch path below.

## APK-patch path

The original TV build patched an official APK because no NDK/CMake was
available. Because the package ID has been changed to `com.example.video`, an
existing APK that still uses the old upstream package ID cannot be patched into
this app; rebuild the native project instead.

1. Build the React Native bundle as Hermes bytecode:

```sh
PATH=/path/to/node22/bin:$PATH NODE_ENV=production npx expo export:embed \
  --platform android --dev false --minify true --bytecode \
  --entry-file node_modules/expo-router/entry.js \
  --bundle-output "build/index.android.bundle" \
  --assets-dest "build/assets"
```

2. Start from a base APK that already uses `com.example.video`, and replace:

   - `assets/index.android.bundle` with `build/index.android.bundle`
   - the content-script asset (`res/*.bjs`, for example `res/7K.bjs`) with
     `assets/scripts/main.bjs`

   The `*.bjs` resource name is generated by Expo/Metro and can change between
   builds; list the APK entries and replace whichever `.bjs` file is present.
   Strip `META-INF/` when repacking.

3. Align and sign with your own key:

```sh
keytool -genkeypair -v -keystore my-release.jks -alias mykey \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass 'change-me' -keypass 'change-me'

zipalign -f 4 unsigned.apk aligned.apk
apksigner sign --ks my-release.jks --ks-pass pass:'change-me' \
  --key-pass pass:'change-me' --out signed.apk aligned.apk
apksigner verify signed.apk
```

4. Uninstall the old package (a different signature wipes app data), then install:

```sh
adb uninstall com.example.video
adb install signed.apk
```

> **Important:** Expo caches the injected content script internally. A
> content-script-only update needs a full uninstall/reinstall, not just
> `pm clear`.

## Runtime notes

- `window.VideoAppTV` is set in `components/page/MainPageContent.tsx`.
- `getCoreCss()` appends `cssContentTV` only when `window.VideoAppTV` is true.
- `injectCSS()` and `installRemoteNavigation()` are deferred until the document
  root exists, so the script cannot abort during `onPageStarted`.
- Fullscreen depends on the `window.VideoApp.setNativeFullscreen` assignment in
  `content/main.ts`; without it the player stays in the normal watch-page layout.
- `remote-navigation.ts` only runs on Android TV
  (`window.isAndroid && window.VideoAppTV`).

## Build artifacts

No prebuilt APK is included in this snapshot; a build from this tree uses the
new package ID and therefore cannot reuse the old installed app's data or
signature.

## Tested device

- Generic Android 11 TV, 1280×720, armeabi-v7a
