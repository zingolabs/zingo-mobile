import { listenerStack } from './listenerStack';

/** What the add-to-address-book sheet opens on. */
export type AddTagTarget = {
  address: string;
  /** One of this wallet's addresses: the own tag sheet, not New contact. */
  own: boolean;
  swapChain: string;
  /**
   * What to put in the label field before the user types, when the launcher
   * knows a name for the address (a ZNS alias, say).
   */
  initialLabel?: string;
};

type AddTagListener = (target: AddTagTarget) => void;

const listeners = listenerStack<AddTagListener>();

/** Called by each AddTagModalHost; returns its removal. */
export const registerAddTagListener = (fn: AddTagListener | null) =>
  listeners.register(fn);

/** Opens the add-to-address-book sheet of the host on top. */
export function showAddTag(target: AddTagTarget): void {
  listeners.top()?.(target);
}
