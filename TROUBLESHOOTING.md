
# Trouble shooting

Feel free to add problems and solutions here.

## iOS PhaseScriptExecution failed

```
** BUILD FAILED **

The following build commands failed:
	PhaseScriptExecution [CP-User]\ Generate\ Specs Library/Developer/Xcode/DerivedData/Zingo-csgvotxsdtutswboneqanoqzmeam/Build/Intermediates.noindex/Pods.build/Debug-iphonesimulator/FBReactNativeSpec.build/Script-81152550C92182B003B23A679F9D8F2E.sh (in target 'FBReactNativeSpec' from project 'Pods')
(1 failure)
```

https://github.com/facebook/react-native/issues/32951

->

`nvm unalias default`

---

## `yarn` hangs on Windows at [4/5] Linking dependencies

```
yarn install v1.22.22
[1/5] Validating package.json...
[2/5] Resolving packages...
[3/5] Fetching packages...
[4/5] Linking dependencies...     <- sits here forever, prints nothing
```

The process is alive but doing nothing useful: no CPU, zero bytes written,
a couple of dozen file-metadata ops a second. That is yarn retrying a delete
that Windows will never grant.

Cause: a Gradle build writes its lint cache *inside* node_modules --
`node_modules/<package>/android/build/intermediates/lint-cache/...` -- and
`assembleProdRelease`/`assembleBetaRelease` run `lintVital` (we promote it
to fatal in `android/app/build.gradle.kts`). The Gradle daemon keeps those
migrated jars open, yarn wants to remove that `build/` directory before
linking, and blocks. Seen with `react-native-vision-camera` and with
`@react-native/gradle-plugin`.

->

Release the lock; do **not** wipe the yarn cache or delete node_modules
(the delete blocks on the very same file):

```bash
cd android && ./gradlew --stop   # also quit Android Studio: it runs its own daemon
yarn install                     # ~5 s once nothing holds the jars
```

To pin it down when it happens again — the last line of the verbose log is
the path yarn is stuck on:

```bash
yarn install --verbose 2>&1 | tail -1
# verbose 2.18 Removing extraneous file "...\react-native-vision-camera\android\build".
```

Then find who is holding it. Any live `java.exe` is the usual suspect:

```powershell
Get-CimInstance Win32_Process -Filter "Name='java.exe'" |
  Select-Object ProcessId, CommandLine
handle64.exe -a -nobanner "<path from the verbose log>"   # Sysinternals, if installed
```

---
