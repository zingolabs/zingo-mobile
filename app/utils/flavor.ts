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
