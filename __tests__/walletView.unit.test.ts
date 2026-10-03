/**
 * selectWalletView — the pure render projection, driven directly. Pins the
 * two render outcomes against the exact input shapes the mount test exercises
 * (LoadedApp.mountFence), so the extraction preserves behavior.
 */
import {
  type WalletViewSource,
  selectWalletView,
} from '@app/AppState/walletView';
import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import { offlineServer, remoteServer } from '@app/AppState/types/ServerType';

const remote = remoteServer(
  'https://indexer.test',
  ChainNameEnum.mainChainName,
);
const offline = offlineServer(ChainNameEnum.mainChainName);

const source = (over: Partial<WalletViewSource> = {}): WalletViewSource => ({
  readOnly: false,
  server: remote,
  ...over,
});

describe('selectWalletView — the two render outcomes', () => {
  it('fullWithSend: spendable and remote', () => {
    expect(selectWalletView(source())).toBe('fullWithSend');
  });

  it('fullWithoutSend: read-only hides Send', () => {
    expect(selectWalletView(source({ readOnly: true }))).toBe(
      'fullWithoutSend',
    );
  });

  it('fullWithoutSend: an offline server hides Send', () => {
    expect(selectWalletView(source({ server: offline }))).toBe(
      'fullWithoutSend',
    );
  });
});
