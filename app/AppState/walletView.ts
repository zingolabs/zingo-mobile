// Picks whether the wallet renders with the Send tab, from observed data only.

import type ServerType from './types/ServerType';

export type WalletView = 'fullWithSend' | 'fullWithoutSend';

// The fields WalletView reads, and only those.
export type WalletViewSource = {
  readOnly: boolean;
  server: ServerType;
};

// A read-only wallet cannot spend, and an offline wallet cannot broadcast, so
// either hides the Send tab.
export const selectWalletView = (src: WalletViewSource): WalletView =>
  !src.readOnly && src.server.kind === 'remote'
    ? 'fullWithSend'
    : 'fullWithoutSend';
