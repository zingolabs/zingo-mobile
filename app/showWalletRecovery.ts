/**
 * Imperative trigger for the wallet-recovery sheet, mirroring showConfirm:
 * the dialog renders as <WalletRecoveryHost/> under the
 * BottomSheetModalProvider. Registered once per provider; a call before
 * mount no-ops (warns in dev).
 */
import { TranslateType } from './AppState/types/TranslateType';

export type WalletRecoveryOptions = {
  title: string;
  message: string;
  diagnosisLines: string;
  translate: (key: string) => TranslateType;
  onCopy: () => void;
  onRestoreBackup?: () => void;
  // Absent hides the button (the damaged file holds no salvageable seed).
  onSalvageSeed?: () => void;
  onSupport: () => void;
  onCancel: () => void;
};

type WalletRecoveryListener = (options: WalletRecoveryOptions) => void;

let listener: WalletRecoveryListener | null = null;

export function registerWalletRecoveryListener(
  fn: WalletRecoveryListener | null,
): void {
  listener = fn;
}

export function showWalletRecovery(options: WalletRecoveryOptions): void {
  if (!listener) {
    if (__DEV__) {
      console.warn(
        '[showWalletRecovery] called before <WalletRecoveryHost/> mounted; dropping',
        options.title,
      );
    }
    return;
  }
  listener(options);
}
