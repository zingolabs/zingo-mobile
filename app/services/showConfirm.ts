import type { ReactNode } from 'react';
import { listenerStack } from './listenerStack';

/**
 * Imperative confirmation-sheet trigger. Mirrors `Alert.alert`'s shape so
 * migrating call sites is mechanical, but the dialog is rendered as a
 * BottomSheetModal via <ConfirmBottomSheet/> mounted under the
 * BottomSheetModalProvider. Each provider mounts one and the last mounted
 * answers; calling showConfirm before any mount no-ops (warns in dev).
 */
export type ConfirmButtonStyle = 'default' | 'cancel' | 'destructive' | 'ghost';

export type ConfirmButton = {
  text: string;
  onPress?: () => void;
  style?: ConfirmButtonStyle;
};

export type ConfirmOptions = {
  title: string;
  message?: string;
  messageAlign?: 'left' | 'center' | 'right';
  // 'danger' sets the message in the warning red.
  messageTone?: 'default' | 'danger';
  // Shown under the message, before the buttons.
  content?: ReactNode;
  buttons: ConfirmButton[];
};

type ConfirmListener = (options: ConfirmOptions) => void;

const listeners = listenerStack<ConfirmListener>();

/** Called by each ConfirmBottomSheet; returns its removal. */
export function registerConfirmListener(
  fn: ConfirmListener | null,
): () => void {
  return listeners.register(fn);
}

export function showConfirm(options: ConfirmOptions): void {
  const listener = listeners.top();
  if (!listener) {
    if (__DEV__) {
      console.warn(
        '[showConfirm] called before <ConfirmBottomSheet/> mounted; dropping',
        options.title,
      );
    }
    return;
  }
  listener(options);
}
