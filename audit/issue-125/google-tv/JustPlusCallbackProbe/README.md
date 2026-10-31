# JustPlusCallbackProbe

Isolated Android test package, no Lampa/Trakt dependencies. Public test media: W3C-hosted Sintel trailer (Blender Foundation, CC BY 3.0). Three distinct per-session item URLs and explicit zero start positions prevent accidental resume reuse.

Build with JDK 17 and Android SDK platform/build-tools 33. Gradle app project is provided. The physical test APK was built using javac, d8, aapt and apksigner from those tools; no binary or signing key is committed. A unique temporary debug key was used. Manifest is debuggable so ADB run-as can read the safe journal.

Launch component: `org.lampa.justplusprobe/.ProbeActivity`; optional boolean extra `interval=true` requests 120-second reports. Each fresh Activity launch creates a UUID. Receiver is explicit and non-exported, PendingIntent mutable and unique by action. ActivityResult is journaled separately. Read `files/events.jsonl` with ADB run-as. Do not use this app for private streams.

The probe was installed independently for the physical tests and removed after evidence capture. Production Lampa and Just+ were retained. Rebuild/reinstall the probe to repeat the tests.

Long mode (`--ez long true`) serves a public Big Buck Bunny fixture through the probe's read-only media provider. Copy the licensed public file to files/bunny.mp4 in this separate debug package before launch. The provider is exported solely for this one public test file and rejects write mode; it exposes no user files. The callback receiver remains non-exported. The successful long run used unique per-session item URIs and explicit zero positions.
