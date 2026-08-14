// WalletView — the total render projection (ADR 0017). One of two outcomes,
// chosen from observed data only: the in-flight command and the stalled
// predicate never enter the selection. This is the pure port of the Send-tab
// gate that lived inline in the LoadedApp render prop (LoadedApp.tsx render,
// the HomeStack body). It reads no clock and holds no state, so a unit test
// drives it directly.

import { SelectServerEnum } from './enums/SelectServerEnum';

export type WalletView = 'fullWithSend' | 'fullWithoutSend';

// The fields WalletView reads, and only those.
export type WalletViewSource = {
  readOnly: boolean;
  selectServer: SelectServerEnum;
};

// A read-only wallet cannot spend, and an offline wallet cannot broadcast, so
// either hides the Send tab.
export const selectWalletView = (src: WalletViewSource): WalletView =>
  !src.readOnly && src.selectServer !== SelectServerEnum.offline
    ? 'fullWithSend'
    : 'fullWithoutSend';
