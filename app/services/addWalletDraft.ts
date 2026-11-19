import { useSyncExternalStore } from 'react';
import { ChainNameEnum, SelectServerEnum, ServerType } from '@app/AppState';
import { offlineServer } from '@app/AppState/types/ServerType';

/**
 * The network and server of a wallet being added, before it exists: what
 * New wallet and Restore wallet show in their bar and what the Server screen
 * edits for them. A viewing key carries its own network, which then stays.
 */
export type AddWalletDraft = {
  server: ServerType;
  selectServer: SelectServerEnum;
  keyChain: { kind: 'none' } | { kind: 'key'; chain: ChainNameEnum };
};

let draft: AddWalletDraft = {
  server: offlineServer(ChainNameEnum.mainChainName),
  selectServer: SelectServerEnum.auto,
  keyChain: { kind: 'none' },
};
const listeners = new Set<() => void>();

export function readAddWalletDraft(): AddWalletDraft {
  return draft;
}

export function setAddWalletDraft(patch: Partial<AddWalletDraft>): void {
  draft = { ...draft, ...patch };
  listeners.forEach(listener => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useAddWalletDraft(): AddWalletDraft {
  return useSyncExternalStore(subscribe, readAddWalletDraft);
}
