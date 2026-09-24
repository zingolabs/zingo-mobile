/**
 * Imperative confirmation-sheet trigger. Mirrors `Alert.alert`'s shape so
 * migrating call sites is mechanical, but the dialog is rendered as a
 * BottomSheetModal via <ConfirmBottomSheet/> mounted under the
 * BottomSheetModalProvider. The sheet is registered exactly once per
 * provider; calling showConfirm before mount no-ops (warns in dev).
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
  buttons: ConfirmButton[];
};

type ConfirmListener = (options: ConfirmOptions) => void;

let listener: ConfirmListener | null = null;

export function registerConfirmListener(fn: ConfirmListener | null): void {
  listener = fn;
}

export function showConfirm(options: ConfirmOptions): void {
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
