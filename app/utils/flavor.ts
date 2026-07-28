import { NativeModules } from 'react-native';

import { ChainNameEnum } from '../AppState';

/**
 * The chain a first run of this build flavor defaults to. The testnet alpha
 * flavor exports "test" through RPCModule's constants; every other flavor —
 * and any platform whose native module predates the constant — defaults to
 * mainnet. Only the no-persisted-settings path consults this: once a server
 * setting exists, it always wins.
 */
export function flavorDefaultChainName(): ChainNameEnum {
  const constant: unknown = (
    NativeModules.RPCModule as { defaultChainName?: string } | undefined
  )?.defaultChainName;
  return constant === ChainNameEnum.testChainName
    ? ChainNameEnum.testChainName
    : ChainNameEnum.mainChainName;
}

/**
 * True when the installed APK carries the FLAG_DEBUGGABLE bit, i.e. a
 * debug-signed build. The embedded JS bundle is always built with
 * `--dev false`, so `__DEV__` is false in any APK that runs without
 * Metro; debug-only surfaces handed to reporters (the Connection
 * Doctor) gate on this constant instead. Platforms without the
 * constant (iOS, older natives) report false.
 */
export function isDebuggableBuild(): boolean {
  return (
    (NativeModules.RPCModule as { debuggableBuild?: boolean } | undefined)
      ?.debuggableBuild === true
  );
}
