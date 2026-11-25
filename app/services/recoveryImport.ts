import { ChainNameEnum, SelectServerEnum } from '@app/AppState';
import ServerType, { remoteServer } from '@app/AppState/types/ServerType';
import { serverUris } from '@app/uris';
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

/** The server a saved wallet comes back on: Automatic, the network's default. */
export const entryServer = (chain: ChainNameEnum): ServerChoice => ({
  server: defaultServer(chain),
  selectServer: SelectServerEnum.auto,
});
