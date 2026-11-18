import { ChainNameEnum, SelectServerEnum } from '@app/AppState';
import ServerType, { remoteServer } from '@app/AppState/types/ServerType';
import { serverUris } from '@app/uris';
import SettingsFileImpl from '@app/services/SettingsFileImpl';
import type { RecoveryEntry } from '@app/services/recoveryWalletInfo';

type ServerChoice = { server: ServerType; selectServer: SelectServerEnum };

/** The network a saved wallet comes back on: its own, or Mainnet for a single-wallet entry. */
export const entryChain = (entry: RecoveryEntry): ChainNameEnum =>
  (entry.chain || ChainNameEnum.mainChainName) as ChainNameEnum;

/** The listed default server of a network, or the first listed one. */
const defaultServer = (chain: ChainNameEnum): ServerType => {
  const listed = serverUris(() => {});
  const found = listed.find(s => s.chainName === chain && s.default);
  const pick = found ?? listed[0];
  return remoteServer(pick.uri, pick.chainName);
};

/**
 * The server a saved wallet comes back on: the one its entry kept, or
 * `current` when it is on the same network, or that network's default.
 */
export const entryServer = async (
  entry: RecoveryEntry,
  chain: ChainNameEnum,
  current: ServerChoice,
): Promise<ServerChoice> => {
  if (entry.server.kind === 'kept') {
    const kept = await SettingsFileImpl.serverOf({
      chain,
      server: entry.server.server,
      selectServer: entry.server.selectServer,
    });
    if (kept.server.chainName === chain) {
      return kept;
    }
  }
  return chain === current.server.chainName
    ? current
    : { server: defaultServer(chain), selectServer: SelectServerEnum.auto };
};
