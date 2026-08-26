import { useEffect, useRef, useState } from 'react';

import simpleBiometrics from '../simpleBiometrics';
import { SnackbarDurationEnum, TranslateType } from '../AppState';

type UseBiometricGateArgs = {
  needsAuth: boolean;
  translate: (key: string) => TranslateType;
  addLastSnackbar: (message: string, duration?: SnackbarDurationEnum) => void;
  onCancel: () => void;
  foregroundAppEnabled: boolean;
  foregroundEpoch: number;
};

/**
 * Audit Issue D — single source of truth for the screen-level biometric
 * gate used by Seed, ShowUfvk, Settings, Rescan and Confirm.
 *
 * Behaviour:
 *   - On mount: triggers simpleBiometrics when `needsAuth` is true.
 *   - On user cancel / fail: emits the standard snackbar via the
 *     supplied `addLastSnackbar` and calls `onCancel` (typically
 *     `navigation.goBack()`).
 *   - On background → active (foregroundEpoch bumps): re-fires the gate
 *     only when `foregroundAppEnabled` is false. LoadedApp's own
 *     foreground gate already covers the enabled case, so re-firing
 *     here would just stack a second prompt on top of it.
 *
 * Returns the boolean `authPassed`. Callers render a placeholder until
 * it flips to true so sensitive content is never visible while a prompt
 * is in flight.
 */
export const useBiometricGate = ({
  needsAuth,
  translate,
  addLastSnackbar,
  onCancel,
  foregroundAppEnabled,
  foregroundEpoch,
}: UseBiometricGateArgs): boolean => {
  const [authPassed, setAuthPassed] = useState<boolean>(!needsAuth);

  // Mount-only initial prompt. Native stack remounts the screen on
  // every navigation, so a single check at mount enforces the gate on
  // each visit.
  useEffect(() => {
    if (!needsAuth) {
      return;
    }
    let cancelled = false;
    (async () => {
      const verdict = await simpleBiometrics({
        translate,
        purpose: 'screenEntry',
      });
      if (cancelled) {
        return;
      }
      if (verdict.kind === 'declined') {
        addLastSnackbar(translate('biometrics-error') as string);
        onCancel();
      } else {
        // 'unavailable' passes: the gate guards nothing, and blocking here
        // would lock the user out of their own wallet.
        setAuthPassed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fire on background → active. Skips the initial render so the
  // mount effect above isn't duplicated.
  const isFirstEpochRef = useRef(true);
  useEffect(() => {
    if (isFirstEpochRef.current) {
      isFirstEpochRef.current = false;
      return;
    }
    if (!needsAuth || foregroundAppEnabled) {
      return;
    }
    setAuthPassed(false);
    let cancelled = false;
    (async () => {
      const verdict = await simpleBiometrics({
        translate,
        purpose: 'screenEntry',
      });
      if (cancelled) {
        return;
      }
      if (verdict.kind === 'declined') {
        addLastSnackbar(translate('biometrics-error') as string);
        onCancel();
      } else {
        // 'unavailable' passes: the gate guards nothing, and blocking here
        // would lock the user out of their own wallet.
        setAuthPassed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foregroundEpoch]);

  return authPassed;
};
