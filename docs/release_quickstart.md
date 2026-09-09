# Release Quickstart

This document covers shipping new versions of Zingo to both stores, on both
production and beta channels.

## Channel architecture

Zingo ships as two parallel apps from this single repo:

| Channel | iOS bundle ID | Android applicationId | Display name | App Store / Play presence |
|---|---|---|---|---|
| **Production** | `org.ZingoLabs.Zingo` | `org.ZingoLabs.Zingo` | "Zingo" | App Store / Play Production |
| **Beta** | `org.ZingoLabs.Zingo.Beta` | `org.ZingoLabs.Zingo.Beta` | "Zingo Beta" | TestFlight External / Play Open Testing |

Both apps share the same JS bundle (`app/`, `screens/`, `ui/`),
the same Rust libs (`libuniffi_zingo.so`, `Zingolib.xcframework`), the same
keystores and certificates. They differ only in bundle ID, display name, and
app icon (Beta has a red `BETA` band). The channel is detected at runtime from
the native binary — there is no JS-side toggle.

## Bumping versions

Use `release-prep` to bump version/build numbers for one channel without
touching the other. The script is idempotent: running it with the current
values produces no diff.

```bash
yarn release:prod:prep <version> <build>   # e.g. 2.0.19 308
yarn release:beta:prep <version> <build>
```

What each subcommand touches:

| File | `prod:prep` | `beta:prep` |
|---|---|---|
| `package.json` `version` | ✓ | — |
| `ios/Zingo.xcodeproj/project.pbxproj` (Debug + Release) | ✓ | — |
| `ios/Zingo.xcodeproj/project.pbxproj` (Debug-Beta + Release-Beta) | — | ✓ |
| `android/app/build.gradle.kts` `defaultConfig` | ✓ | — |
| `android/app/build.gradle.kts` flavor `beta` | — | ✓ |

Prod and beta versionCodes/build numbers evolve independently. Same versionName
is fine across channels.

After the bump, `release-prep` prints the suggested commit / push / tag
commands to copy-paste. Pushing the tag triggers the Android Release CI
workflow described below.

## Release order: tag first, then rebuild the Rust libs

Gradle never invokes cargo, and Xcode never invokes cargo. The native libs
(`android/app/src/main/jniLibs/<abi>/libuniffi_zingo.so`, `ios/Zingolib.xcframework`)
are produced by the separate `yarn rust:android` / `yarn rust:ios` steps, and
the AAB / archive just packages whatever is already sitting there.

That ordering is visible to users. `rust/lib/build.rs` runs
`git describe --long --match=zingo-*` **at cargo build time** and bakes the
result into the binary; `get_version()` returns
`<zingolib descriptor>-zm_<tag>[_<commits-since-tag>_<hash5>][_dirty]`, which is
the string on the **zingolib** line of the About screen. So it describes the
commit the `.so` was compiled at — not the app around it. (The version in the
About header, and what the stores show, is unrelated: it comes from
`versionName`/`versionCode` at runtime via `app/utils/ZingoAppData.ts`.)

Build the Rust libs before creating the tag and the About screen advertises the
*previous* tag plus a commit count — e.g. build 327 shipped showing
`zm_beta-2.0.23-326_83_5ea12`, because the `.so` was compiled 83 commits past
tag `zingo-beta-2.0.23-326`, one commit short of the commit tagged `-327`.

Correct order for any store build:

1. `yarn release:<channel>:prep <ver> <build>`
2. `git commit` the bump
3. `git tag ...` — the tag must exist locally before step 4; push it whenever
4. `yarn rust:android` / `yarn rust:ios` — recompiles the native libs sitting
   exactly on the tag, so the descriptor collapses to a clean `zm_<tag>`
5. Build the AAB (Android Studio / gradle) or Archive in Xcode

Anything other than a bare `zm_<tag>` on the About screen means the shipped
native lib does not correspond to the tag: a `_<count>_<hash>` suffix means it
was built that many commits before (or after) the tag, and `_dirty` means it was
built from an uncommitted working tree.

This only affects the manual store builds. The tag-triggered APKs below are
built by CI from source on the tagged commit, so their descriptor is always
clean.

## Tag-triggered Android APKs

Pushing a release tag publishes a set of Android APKs as a GitHub Release.
This is independent from the store uploads — it exists for sideloading,
internal QA distribution, and reproducible per-commit archives.

| Channel | Tag format | GitHub Release |
|---|---|---|
| prod | `zingo-<version>-<build>` | latest release, `prerelease=false` |
| beta | `zingo-beta-<version>-<build>` | new release, `prerelease=true` |

The `.github/workflows/android-release.yaml` workflow:

1. Builds the rust native libs (4 ABIs in parallel) and the uniffi kotlin
   bindings from source on the tagged commit. **No `actions/cache` is read
   or written for these outputs** — all cross-job hand-off is via
   `upload-artifact`, which is run-scoped. The maven dependency cache is
   used in read-only mode (artifacts are content-addressed and signed).
2. Assembles `assembleProdRelease` or `assembleBetaRelease` with
   `-PsplitApk=true -PincludeUniversalApk=true`.
3. Publishes 5 APKs to the release:
   - `<prefix>-armeabi-v7a-<version>-<build>.apk` (32-bit ARM)
   - `<prefix>-arm64-v8a-<version>-<build>.apk` (64-bit ARM, most modern phones)
   - `<prefix>-x86-<version>-<build>.apk` (32-bit x86, emulators)
   - `<prefix>-x86_64-<version>-<build>.apk` (64-bit x86, emulators)
   - `<prefix>-universal-<version>-<build>.apk` (single APK with all 4 ABIs)

   where `<prefix>` is `zingo` or `zingo-beta`.

These APKs are signed with `debug.keystore`.

## Shipping Production

### iOS

1. `yarn release:prod:prep <ver> <build>`, commit the diff, and create the tag.
2. `yarn rust:ios` — rebuild the xcframework on the tag (see
   [Release order](#release-order-tag-first-then-rebuild-the-rust-libs)).
3. Open `ios/Zingo.xcworkspace` in Xcode.
4. Select scheme **Zingo**, destination **Any iOS Device (arm64)**.
5. **Product → Archive**.
6. In the Organizer that opens: **Distribute App → App Store Connect → Upload**.
   Signing is Automatic — your account needs to be a member of the team that
   owns the App Store Connect record.
7. Wait ~10-20 min for "build processed" email from Apple.
8. App Store Connect → app "Zingo" → fill **What's New** for the version and
   submit for App Store Review.

### Android

1. `yarn release:prod:prep <ver> <build>` (use the same numbers as the matching
   iOS bump for consistency, even though they're independent under the hood),
   commit, and create the tag.
2. `yarn rust:android` — rebuild the `.so`s on the tag (see
   [Release order](#release-order-tag-first-then-rebuild-the-rust-libs)).
3. Android Studio → **Build → Generate Signed App Bundle / APK** → AAB.
4. Point the wizard at the release keystore and enter its passwords (see
   *First-time dev setup* below for where they live).
5. Build variant: **prodRelease**.
6. Output AAB lands under `android/app/prod/release/`.
7. Play Console → app "Zingo" → **Production** → Create new release → upload
   AAB → fill release notes → Review release → Roll out.

CLI equivalents (without local signing config in place, gradle falls back to
the debug keystore — fine for local smoke testing, not for store upload):

```bash
yarn build:release           # universal APK
yarn build:release:split     # per-ABI APKs
cd android && ./gradlew bundleProdRelease   # AAB
```

## Shipping Beta

### iOS (TestFlight External + public link)

1. `yarn release:beta:prep <ver> <build>`, commit, and create the tag.
2. `yarn rust:ios` — rebuild the xcframework on the tag (see
   [Release order](#release-order-tag-first-then-rebuild-the-rust-libs)).
3. Xcode scheme **Zingo Beta** → **Product → Archive** → **Distribute App →
   App Store Connect → Upload**.
4. After "build processed", in App Store Connect → app "Zingo Beta" →
   **TestFlight**:
   - Click the new build → **Manage** → mark **Missing Compliance** (encryption
     declaration carries over from `Info.plist`, just acknowledge it once per build).
   - **External Testing → Zingo Beta Public** group → **Add Build** → select the
     uploaded build.
   - Fill **Beta App Review** info (description, what to test, "No login
     required" notes) → **Submit for Review**.
5. Apple's review of the **first build of each major version** takes 24-48h.
   Subsequent builds of the same major usually auto-approve.
6. After approval, toggle on the **Public Link** in the External group settings.
   The URL is `testflight.apple.com/join/XXXXXXXX` — share with testers.

### Android (Play Open Testing + public link)

1. `yarn release:beta:prep <ver> <build>`, commit, and create the tag.
2. `yarn rust:android` — rebuild the `.so`s on the tag (see
   [Release order](#release-order-tag-first-then-rebuild-the-rust-libs)).
3. Android Studio → **Build → Generate Signed App Bundle / APK** → AAB →
   variant **betaRelease**.
4. AAB at `android/app/beta/release/app-beta-release.aab`.
5. Play Console → app "Zingo Beta" → **Testing → Open testing → Create new
   release** → upload AAB.
6. Fill **Release notes** (EN at minimum) → **Save → Review release → Roll
   out**.
7. First release of an Open testing track needs Google's content review
   (typically 1-3 days). After approval, share the **opt-in URL** from the
   Open testing → **Testers** tab.

CLI equivalents:

```bash
yarn build:beta:release          # universal APK
yarn build:beta:release:split    # per-ABI APKs
yarn build:beta:release:aab      # AAB (what Play wants)
```

## First-time dev setup

### Android signing
1. Get the release keystore and its credentials from a teammate. Both the
   keystore file and the properties file are gitignored — drop them under
   `android/` at the paths gradle expects (see `android/app/build.gradle.kts`
   for the exact filenames).
2. Without them, `gradle assembleProdRelease` and `assembleBetaRelease` fall
   back to `debug.keystore` — the resulting AAB is not Play-uploadable but is
   usable for local install / smoke testing.

### iOS signing
Sign into the team's Apple ID in Xcode. Automatic Signing provisions both
`org.ZingoLabs.Zingo` and `org.ZingoLabs.Zingo.Beta` on the first Archive of
each variant.

## Architecture cheatsheet

### iOS build configurations
- `Debug`, `Release` → prod
- `Debug-Beta`, `Release-Beta` → beta
- Per-config overrides: `PRODUCT_BUNDLE_IDENTIFIER`, `INFOPLIST_KEY_CFBundleDisplayName`, `ASSETCATALOG_COMPILER_APPICON_NAME`.
- `release-prep` distinguishes channels using `ASSETCATALOG_COMPILER_APPICON_NAME` as the anchor (prod = `AppIcon`, beta = `"AppIcon-Beta"`).
- Two shared schemes: `Zingo.xcscheme`, `Zingo Beta.xcscheme`.

### Android product flavors
- Flavors `prod` and `beta` on dimension `channel`.
- `beta`: `applicationIdSuffix = ".Beta"`, `versionCode` override, `resValue("string", "app_name", "Zingo Beta")`.
- Beta resource overlay: `android/app/src/beta/res/mipmap-*/` (icons with BETA band).
- Hardcoded `app_name` removed from `strings.xml` — provided per-flavor via `resValue`.

### Runtime version
`app/utils/ZingoAppData.ts` derives the displayed version from
`react-native-device-info` at runtime. The displayed string is always
consistent with the binary the user installed, regardless of which channel
the shared JS bundle was prepped against.

The **zingolib** line on the About screen is a different thing entirely: it is
the source descriptor compiled into the native lib, see
[Release order](#release-order-tag-first-then-rebuild-the-rust-libs).

### Known caveats
- **Bundle ID case sensitivity**: both iOS and Android use `.Beta` (capital B). The `applicationIdSuffix` in `build.gradle.kts` is intentionally capital to match what's registered in App Store Connect and Play Console.
- **AAB / APK never committed**: gitignored (`*.aab`, `*.apk`, `android/app/beta/release/`, `android/app/release/`).
- **UniFFI bindings refresh**: the Kotlin bindings are generated, not checked in. `yarn rust:android` writes them into `android/app/build/generated/source/uniffi/{debug,release}/...`, and `node scripts/generate_kotlin_bindings.mjs` writes them on their own. After a `gradle clean`, run one of the two before the Kotlin compile.
