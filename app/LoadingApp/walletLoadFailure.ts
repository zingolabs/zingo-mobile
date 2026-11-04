import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import { WalletErrorCause } from '@app/AppState/types/WalletErrorInfo';
import {
  checksumValid,
  isViewingKey,
  tokenize,
  viewingKeyChain,
  viewingKeyProblem,
} from '@app/utils/seedPhrase';
import { FfiErrorCode } from '@app/walletBackend';

/**
 * The cause comes from the error's type and never from its text. A chain
 * mismatch is left out: its screen needs the wallet's network, so it only
 * gets there through `showChainError`.
 */
const CAUSE_BY_CODE: Partial<Record<FfiErrorCode, WalletErrorCause>> = {
  InitServer: 'server',
  InitKey: 'key',
  InitWalletFile: 'file',
};

export const causeOf = (code: FfiErrorCode): WalletErrorCause =>
  CAUSE_BY_CODE[code] ?? 'unknown';

/**
 * Whether a seed or viewing key is worth sending to zingolib: everything that
 * can be told here without it. The form checks the same as the user types;
 * this also covers what the Keychain hands over.
 */
export const restoreKeyUsable = (
  seedUfvk: string,
  serverChain: ChainNameEnum,
): boolean => {
  const key = seedUfvk.trim().toLowerCase();
  if (!isViewingKey(key)) {
    return checksumValid(tokenize(key));
  }
  return (
    viewingKeyProblem(key).kind === 'none' &&
    (serverChain === ChainNameEnum.noneChainName ||
      viewingKeyChain(key) === serverChain)
  );
};
