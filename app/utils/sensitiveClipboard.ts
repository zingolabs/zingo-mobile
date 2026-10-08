import { NativeModules } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

type PrivacyGuardAPI = {
  copySensitive(text: string, seconds: number): Promise<boolean>;
};

export const SENSITIVE_CLIPBOARD_MS = 60 * 1000;

let clearTimer: ReturnType<typeof setTimeout> | undefined;

/** Copies recovery material and empties the clipboard after a minute, past the copying screen's unmount. */
export const copySensitive = async (
  text: string,
  onCleared: () => void,
): Promise<void> => {
  clearTimeout(clearTimer);
  const PrivacyGuard = NativeModules.PrivacyGuard as
    PrivacyGuardAPI | undefined;
  if (PrivacyGuard) {
    await PrivacyGuard.copySensitive(text, SENSITIVE_CLIPBOARD_MS / 1000);
  } else {
    Clipboard.setString(text);
  }
  clearTimer = setTimeout(() => {
    clearTimer = undefined;
    Clipboard.setString('');
    onCleared();
  }, SENSITIVE_CLIPBOARD_MS);
};
