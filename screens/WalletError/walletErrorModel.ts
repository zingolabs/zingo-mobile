import {
  WalletErrorCause,
  WalletLoadKind,
} from '@app/AppState/types/WalletErrorInfo';

export type WalletErrorAction =
  'retry' | 'server' | 'back' | 'import' | 'create' | 'chain' | 'more' | 'none';

export type WalletErrorModel = {
  titleKey: string;
  subKey: string;
  retryKey: string;
  stillKey: string;
  primary: WalletErrorAction;
  above: WalletErrorAction;
  below: WalletErrorAction;
};

const LOAD_TEXTS: Record<
  WalletLoadKind,
  { titleKey: string; subKey: string; retryKey: string; stillKey: string }
> = {
  open: {
    titleKey: 'walleterror.open-title',
    subKey: 'walleterror.open-sub',
    retryKey: 'walleterror.open',
    stillKey: 'walleterror.still-open',
  },
  create: {
    titleKey: 'walleterror.create-title',
    subKey: 'walleterror.create-sub',
    retryKey: 'walleterror.create',
    stillKey: 'walleterror.still-create',
  },
  restore: {
    titleKey: 'walleterror.restore-title',
    subKey: 'walleterror.restore-sub',
    retryKey: 'walleterror.restore',
    stillKey: 'walleterror.still-restore',
  },
};

/**
 * The cause picks the fix and the load only the literals and the way out: an
 * open has a wallet on the phone and no screen before it, so its way out is
 * to replace that wallet.
 */
export const walletErrorModel = (
  cause: WalletErrorCause,
  load: WalletLoadKind,
): WalletErrorModel => {
  const texts = LOAD_TEXTS[load];
  const out =
    load === 'open'
      ? { above: 'import' as const, below: 'create' as const }
      : { above: 'none' as const, below: 'back' as const };
  switch (cause) {
    case 'server':
      return {
        ...texts,
        titleKey: 'walleterror.server-title',
        subKey: 'walleterror.server-sub',
        stillKey: 'walleterror.still-server',
        primary: 'server',
        ...out,
      };
    case 'key':
      return {
        ...texts,
        titleKey: 'walleterror.key-title',
        subKey: 'walleterror.key-sub',
        primary: 'back',
        above: 'none',
        below: 'none',
      };
    case 'file':
      return {
        ...texts,
        titleKey: 'walleterror.file-title',
        subKey: 'walleterror.open-sub',
        primary: 'retry',
        ...out,
      };
    case 'chain':
      return { ...texts, primary: 'chain', above: 'more', below: 'none' };
    case 'unknown':
      return { ...texts, primary: 'retry', ...out };
  }
};
