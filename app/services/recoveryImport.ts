import { ChainNameEnum, SelectServerEnum } from '@app/AppState';
import ServerType, { remoteServer } from '@app/AppState/types/ServerType';
import type { TranslateType } from '@app/AppState';
import { serverUris } from '@app/uris';
import { pickAutomatic } from '@app/services/serverPicking';
import type { RecoveryEntry } from '@app/services/recoveryWalletInfo';

type ServerChoice = { server: ServerType; selectServer: SelectServerEnum };

/** The network a saved wallet comes back on: its own, or Mainnet for a single-wallet entry. */
export const entryChain = (entry: RecoveryEntry): ChainNameEnum =>
  (entry.chain || ChainNameEnum.mainChainName) as ChainNameEnum;

/** The listed default server of a network, or the first listed one. */
const defaultServer = (chain: ChainNameEnum): ServerType => {
  const listed = serverUris(() => {});
  const found = listed.find(
    s => s.chainName === chain && s.default && !s.obsolete,
  );
  const pick = found ?? listed[0];
  return remoteServer(pick.uri, pick.chainName);
};

/**
 * The server a saved wallet comes back on, in Automatic: Mainnet's
 * recommended one, and on Testnet the best that answers.
 */
export const entryServer = async (
  chain: ChainNameEnum,
  translate: (key: string) => TranslateType,
  online: boolean,
): Promise<ServerChoice> => {
  if (chain !== ChainNameEnum.testChainName) {
    return {
      server: defaultServer(chain),
      selectServer: SelectServerEnum.auto,
    };
  }
  const pick = await pickAutomatic(translate, chain, online);
  return {
    server: pick ? remoteServer(pick.server.uri, chain) : defaultServer(chain),
    selectServer: SelectServerEnum.auto,
  };
};
