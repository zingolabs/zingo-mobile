import {
  AddressBookFileClass,
  BackgroundType,
  BlockExplorerEnum,
  LanguageEnum,
  SelectServerEnum,
  ServerType,
} from '@app/AppState';
import { TotalBalanceClass } from '@app/wallet/classes';
import type { ValueTransferType } from '@app/wallet/types';
import type { WalletEntry } from '@app/walletBackend/utils/walletStore';

/**
 * What a wallet opened in place takes from the one it replaces: the app's
 * own settings, the new wallet's, and the figures Home shows faded until
 * the new wallet's arrive. With it the wallet section mounts without a
 * loading screen.
 */
export type WalletHandoff = {
  walletId: string;
  opening: WalletEntry;
  settings: {
    language: LanguageEnum;
    privacy: boolean;
    flipToHide: boolean;
    biometrics: boolean;
    blockExplorer: BlockExplorerEnum;
    addressBook: AddressBookFileClass[];
    backgroundSyncInfo: BackgroundType;
    server: ServerType;
    selectServer: SelectServerEnum;
    seedBackedUp: boolean;
    seedBackedUpAt: number;
    viewOnlyNoticeDismissed: boolean;
  };
  figures:
    | { kind: 'none' }
    | {
        kind: 'shown';
        totalBalance: TotalBalanceClass;
        valueTransfers: ValueTransferType[];
        valueTransfersTotal: number;
      };
};

export type PendingHandoff =
  { kind: 'none' } | { kind: 'handoff'; handoff: WalletHandoff };

let pending: PendingHandoff = { kind: 'none' };

/** Leaves the handoff for the wallet section about to mount. */
export function leaveHandoff(handoff: WalletHandoff): void {
  pending = { kind: 'handoff', handoff };
}

/** Takes the handoff left for this wallet, once. */
export function takeHandoff(walletId: string): PendingHandoff {
  const taken = pending;
  pending = { kind: 'none' };
  return taken.kind === 'handoff' && taken.handoff.walletId === walletId
    ? taken
    : { kind: 'none' };
}
