/**
 * selectWalletView — the pure render projection, driven directly. Pins the
 * two render outcomes against the exact input shapes the mount test exercises
 * (LoadedApp.mountFence), so the extraction preserves behavior.
 */
import {
  type WalletViewSource,
  selectWalletView,
} from '@app/AppState/walletView';
import { SelectServerEnum } from '@app/AppState/enums/SelectServerEnum';

const source = (over: Partial<WalletViewSource> = {}): WalletViewSource => ({
  readOnly: false,
  selectServer: SelectServerEnum.auto,
  ...over,
});

describe('selectWalletView — the two render outcomes', () => {
  it('fullWithSend: spendable and online', () => {
    expect(selectWalletView(source())).toBe('fullWithSend');
  });

  it('fullWithoutSend: read-only hides Send', () => {
    expect(selectWalletView(source({ readOnly: true }))).toBe(
      'fullWithoutSend',
    );
  });

  it('fullWithoutSend: offline hides Send', () => {
    expect(
      selectWalletView(source({ selectServer: SelectServerEnum.offline })),
    ).toBe('fullWithoutSend');
  });

  it.each([
    SelectServerEnum.auto,
    SelectServerEnum.list,
    SelectServerEnum.custom,
  ])('every online selection (%s) shows Send', selectServer => {
    expect(selectWalletView(source({ selectServer }))).toBe('fullWithSend');
  });
});
