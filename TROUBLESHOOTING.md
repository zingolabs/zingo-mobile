
# Trouble shooting

Feel free to add problems and solutions here.

## iOS PhaseScriptExecution failed

```
** BUILD FAILED **

The following build commands failed:
	PhaseScriptExecution [CP-User]\ Generate\ Specs Library/Developer/Xcode/DerivedData/ZingoMobile-csgvotxsdtutswboneqanoqzmeam/Build/Intermediates.noindex/Pods.build/Debug-iphonesimulator/FBReactNativeSpec.build/Script-81152550C92182B003B23A679F9D8F2E.sh (in target 'FBReactNativeSpec' from project 'Pods')
(1 failure)
```

https://github.com/facebook/react-native/issues/32951

->

`nvm unalias default`

---
