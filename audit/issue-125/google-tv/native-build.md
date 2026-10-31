# Reproducible Android test build

## Source and patches

- Upstream: `https://github.com/lampa-app/LAMPA`, tag `v1.13.5`, base commit `f6d9a9318a889b53edccd81fbe7050ec17dfd2ba`.
- Production-compatible Android proposal: `native-bridge-v1.13.5.patch`.
- Separate debug instrumentation/package/site override: `native-debug-v1.13.5.patch`.
- The debug patch is for acceptance only. It enables WebView debugging and a local `/lampa/trakt/trakt.js` asset override for the parallel package; do not apply those hooks to a production release.

## Build

Use JDK 17 and Android SDK platform 34. In a clean checkout at the base commit, apply `native-debug-v1.13.5.patch`, then place a test asset at `app/src/main/assets/issue125/trakt.js`. Build this asset by concatenating a debug-only mock-transport prefix (enabled only when `AndroidJS.issue125MockTransportEnabled()` is true) with the current repository `trakt/trakt.js`. The mock implements history GET read-back and a first-request HTTP 503 followed by a successful mock response; it does not contact Trakt history.

```sh
JAVA_HOME="$ISSUE125_JDK" ANDROID_HOME="$ISSUE125_SDK" \
  ANDROID_USER_HOME="$ISSUE125_ANDROID_CACHE" GRADLE_USER_HOME="$ISSUE125_GRADLE_CACHE" \
  ./gradlew :app:assembleLiteDebug -Pissue125VersionCode=581 --no-daemon
```

Output: `app/build/outputs/apk/lite/debug/app-lite-debug.apk`. Package ID is `top.rootu.lampa.issue125probe`, versionCode 581, label `Lampa Trakt Test`. The official package remains `top.rootu.lampa`.

## Verified artifact and rollback

The test APK is retained outside Git at `artifacts/issue125/lampa-1.13.5-issue125-persistent-test.apk`. SHA-256: `f6568a51afde05933f111cea2c5ea21292b9aa51f65f2dabe5962e04f34c0b97`. The pulled installed `base.apk` had the same SHA. Signer certificate SHA-256: `e796a3d3972f0b1e598b43e2dc84834ee3be241bae8b351601f676147990ad9b`.

Injected Trakt JS asset SHA-256: `4057ba0b6d162efe55671560561f288029058722f978134fa6daae7aea2d3cad`. Repository `trakt/trakt.js` SHA-256: `ba14c7f87974377c81272ed288370e9318a0044f4eec7bd0fb2a4628b6eb25f0`. The APK runtime log confirmed the exact asset SHA at the script request URL.

Install or update only the parallel package, preserving its data:

```sh
adb install -r artifacts/issue125/lampa-1.13.5-issue125-persistent-test.apk
adb shell am start -n top.rootu.lampa.issue125probe/top.rootu.lampa.MainActivity
```

Rollback means opening the untouched official package; it does not require clearing or uninstalling either app:

```sh
adb shell am start -n top.rootu.lampa/top.rootu.lampa.MainActivity
```

The APK and signing key are not committed. The installed debug package is not a permanent-use release build.
