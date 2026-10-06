export type WalletErrorKind = 'open' | 'server';

// What the error screen shows when the wallet on disk will not open.
export type WalletErrorInfo = {
  kind: WalletErrorKind;
  details: string;
};
