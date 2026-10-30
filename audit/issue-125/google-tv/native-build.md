# Reproduce the isolated native build

Use a clean separate checkout of `https://github.com/lampa-app/LAMPA` at tag `v1.13.5` / commit `f6d9a9318a889b53edccd81fbe7050ec17dfd2ba`. Apply **native-debug-v1.13.5.patch** to that checkout. It includes the bridge plus debug-only fixture intents, sanitized trace and distinct applicationId suffix `.issue125probe`. **native-bridge-v1.13.5.patch** is the production bridge subset without test intents, trace or package changes; it is a separate upstream proposal, not an APK to install automatically.

Build with JDK 17, Android SDK platform 34 and Build Tools 30.0.3:

```sh
JAVA_HOME="$ISSUE125_JDK" ANDROID_HOME="$ISSUE125_SDK" \
  ANDROID_USER_HOME="$ISSUE125_ANDROID_CACHE" GRADLE_USER_HOME="$ISSUE125_GRADLE_CACHE" \
  ./gradlew :app:assembleLiteDebug --no-daemon
```

Output: `app/build/outputs/apk/lite/debug/app-lite-debug.apk`. The tested build completed successfully. The source version helper used versionCode 1 because this tag-only checkout lacks origin/main; this is an isolated package and does not replace production versionCode 581. Build metadata and exact hashes are in build-metadata.json. The final debug APK was also retained outside Git under the workspace artifacts/issue125 directory. Signing keys/APKs are not committed.

Before installation verify the APK applicationId is **top.rootu.lampa.issue125probe**, then use adb push + pm install on that file. Never target top.rootu.lampa. The production APK remained 1.13.5/581. The independent Probe remains a separate org.lampa.justplusprobe package.

For the controlled web fixture, run webview-probe/serve.py, reverse its port with ADB and launch the debug Activity with `issue125_probe_url`. The debug-only `issue125_probe_play` JSON is passed to the original runPlayer/configureJustPlusPlaylistIntent path; fixture card and playlist identities must match the JS fixture. `issue125_probe_recreate=true` calls Android recreate() once. These are explicitly new test-only hooks, not upstream APIs.

The parallel site-test APK has a separate package and label `Lampa Trakt Test`. It injects the exact repository `trakt/trakt.js` asset only for the GitHub Pages `/lampa/trakt/trakt.js` resource, and the override is compiled only in the debug test source. Do not use it to replace the official application.

Install/update without clearing its data:

```sh
adb install -r artifacts/issue125/lampa-1.13.5-issue125-site-test.apk
adb shell am start -n top.rootu.lampa.issue125probe/top.rootu.lampa.MainActivity \
  --es issue125_probe_url 'https://siaivo.github.io'
```

Before installation, verify package ID and SHA-256 in `build-metadata.json`. The APK is intentionally outside Git. To roll back the test build, force-stop it and reopen the untouched official application:

```sh
adb shell am force-stop top.rootu.lampa.issue125probe
adb shell am start -n top.rootu.lampa/top.rootu.lampa.MainActivity
```

This leaves test-app data and the official app/settings intact. Uninstall the test package only if its local test profile is no longer needed.

The physical test uses the actual Kotlin receiver/take/handle/normalizer, the proposed raw bridge, actual WebView, production JS helpers and finish(), with mock API transport. The read-only actual-site smoke check is documented separately. Authenticated Trakt API writes and actual Trakt+ UI rendering remain unverified; the debug APK is not approved as a permanent production replacement.
