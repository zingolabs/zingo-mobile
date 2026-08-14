// The Jotai holder for the view slice. The class publishes its view fields into
// the source atom; the derived `walletViewAtom`
// gates notifications by the WalletView outcome, so a consumer reading the view
// wakes only when the view itself changes, not on every container commit.

import { atom } from 'jotai';
import { selectAtom } from 'jotai/utils';

import { ModeEnum } from './enums/ModeEnum';
import { SelectServerEnum } from './enums/SelectServerEnum';
import { type WalletViewSource, selectWalletView } from './walletView';

export const initialWalletViewSource: WalletViewSource = {
  mode: ModeEnum.advanced,
  readOnly: false,
  selectServer: SelectServerEnum.auto,
  totalBalance: null,
  valueTransfers: null,
  valueTransfersTotal: null,
  addresses: null,
};

// The controller-held view source. Only the container writes it.
export const walletViewSourceAtom = atom<WalletViewSource>(
  initialWalletViewSource,
);

// selectAtom recomputes on any source change but notifies subscribers only when
// the derived WalletView differs (Object.is over the four string outcomes). A
// change to an unread field therefore wakes no view consumer.
export const walletViewAtom = selectAtom(walletViewSourceAtom, selectWalletView);
