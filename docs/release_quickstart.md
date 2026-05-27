# Release Quickstart

This document covers shipping new versions of Zingo to both stores, on both
production and beta channels.

## Channel architecture

Zingo ships as two parallel apps from this single repo:

| Channel | iOS bundle ID | Android applicationId | Display name | App Store / Play presence |
|---|---|---|---|---|
| **Production** | `org.ZingoLabs.Zingo` | `org.ZingoLabs.Zingo` | "Zingo" | App Store / Play Production |
| **Beta** | `org.ZingoLabs.Zingo.Beta` | `org.ZingoLabs.Zingo.Beta` | "Zingo Beta" | TestFlight External / Play Open Testing |

Both apps share the same JS bundle (`app/`, `components/`, `app/translations/`),
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

## Shipping Production

### iOS

1. `yarn release:prod:prep <ver> <build>` and commit the diff.
2. Open `ios/Zingo.xcworkspace` in Xcode.
3. Select scheme **Zingo**, destination **Any iOS Device (arm64)**.
4. **Product → Archive**.
5. In the Organizer that opens: **Distribute App → App Store Connect → Upload**.
   Signing is Automatic — your account needs to be a member of the team that
   owns the App Store Connect record.
6. Wait ~10-20 min for "build processed" email from Apple.
7. App Store Connect → app "Zingo" → fill **What's New** for the version and
   submit for App Store Review.

### Android

1. `yarn release:prod:prep <ver> <build>` (use the same numbers as the matching
   iOS bump for consistency, even though they're independent under the hood).
2. Android Studio → **Build → Generate Signed App Bundle / APK** → AAB.
3. Point the wizard at the release keystore and enter its passwords (see
   *First-time dev setup* below for where they live).
4. Build variant: **prodRelease**.
5. Output AAB lands under `android/app/prod/release/`.
6. Play Console → app "Zingo" → **Production** → Create new release → upload
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

1. `yarn release:beta:prep <ver> <build>` and commit.
2. Xcode scheme **Zingo Beta** → **Product → Archive** → **Distribute App →
   App Store Connect → Upload**.
3. After "build processed", in App Store Connect → app "Zingo Beta" →
   **TestFlight**:
   - Click the new build → **Manage** → mark **Missing Compliance** (encryption
     declaration carries over from `Info.plist`, just acknowledge it once per build).
   - **External Testing → Zingo Beta Public** group → **Add Build** → select the
     uploaded build.
   - Fill **Beta App Review** info (description, what to test, "No login
     required" notes) → **Submit for Review**.
4. Apple's review of the **first build of each major version** takes 24-48h.
   Subsequent builds of the same major usually auto-approve.
5. After approval, toggle on the **Public Link** in the External group settings.
   The URL is `testflight.apple.com/join/XXXXXXXX` — share with testers.

### Android (Play Open Testing + public link)

1. `yarn release:beta:prep <ver> <build>` and commit.
2. Android Studio → **Build → Generate Signed App Bundle / APK** → AAB →
   variant **betaRelease**.
3. AAB at `android/app/beta/release/app-beta-release.aab`.
4. Play Console → app "Zingo Beta" → **Testing → Open testing → Create new
   release** → upload AAB.
5. Fill **Release notes** (EN at minimum) → **Save → Review release → Roll
   out**.
6. First release of an Open testing track needs Google's content review
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
`app/utils/zingoVersion.ts` derives the displayed version from
`react-native-device-info` at runtime. The displayed string is always
consistent with the binary the user installed, regardless of which channel
the shared JS bundle was prepped against.

### Known caveats
- **Bundle ID case sensitivity**: both iOS and Android use `.Beta` (capital B). The `applicationIdSuffix` in `build.gradle.kts` is intentionally capital to match what's registered in App Store Connect and Play Console.
- **AAB / APK never committed**: gitignored (`*.aab`, `*.apk`, `android/app/beta/release/`, `android/app/release/`).
- **UniFFI bindings refresh**: `rust/lib/src/uniffi/zingo/zingo.kt` is the source of truth; `yarn rust:android` copies it into `android/app/build/generated/source/uniffi/{debug,release}/...`. If you `gradle clean` without re-running `yarn rust:android`, you'll see `Unresolved reference 'initLogging'` errors at Kotlin compile — re-run `yarn rust:android` to refresh.
