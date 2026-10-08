import Clipboard from '@react-native-clipboard/clipboard';

export const SENSITIVE_CLIPBOARD_MS = 60 * 1000;

let clearTimer: ReturnType<typeof setTimeout> | undefined;

/** Copies recovery material and empties the clipboard after a minute, past the copying screen's unmount. */
export const copySensitive = (text: string, onCleared: () => void): void => {
  clearTimeout(clearTimer);
  Clipboard.setString(text);
  clearTimer = setTimeout(() => {
    clearTimer = undefined;
    Clipboard.setString('');
    onCleared();
  }, SENSITIVE_CLIPBOARD_MS);
};
