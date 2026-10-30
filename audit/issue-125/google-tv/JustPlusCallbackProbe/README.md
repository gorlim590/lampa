# JustPlusCallbackProbe

Isolated Android test package, no Lampa/Trakt dependencies. Public test media: W3C-hosted Sintel trailer (Blender Foundation, CC BY 3.0). Three distinct per-session item URLs and explicit zero start positions prevent accidental resume reuse.

Build with JDK 17 and Android SDK platform/build-tools 33. Gradle app project is provided. The physical test APK was built using javac, d8, aapt and apksigner from those tools; no binary or signing key is committed. A unique temporary debug key was used. Manifest is debuggable so ADB run-as can read the safe journal.

Launch component: `org.lampa.justplusprobe/.ProbeActivity`; optional boolean extra `interval=true` requests 120-second reports. Each fresh Activity launch creates a UUID. Receiver is explicit and non-exported, PendingIntent mutable and unique by action. ActivityResult is journaled separately. Read `files/events.jsonl` with ADB run-as. Do not use this app for private streams.

The probe remains installed as an independent app after testing. Production Lampa and Just+ were not replaced. It can be removed later without touching either production application.
