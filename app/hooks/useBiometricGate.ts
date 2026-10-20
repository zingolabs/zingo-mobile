import { useEffect, useState } from 'react';

import { askGate, enactGateAnswer } from '@app/services/gateController';
import { SnackbarDurationEnum, TranslateType } from '@app/AppState';

type UseBiometricGateArgs = {
  needsAuth: boolean;
  translate: (key: string) => TranslateType;
  addLastSnackbar: (message: string, duration?: SnackbarDurationEnum) => void;
  onCancel: () => void;
};

/** The screen gate's named states, so callers never read a bare boolean. */
export type ScreenGateState =
  { kind: 'checking' } | { kind: 'passed' } | { kind: 'refused' };

/**
 * Audit Issue D — single source of truth for the screen-level biometric
 * gate used by WalletSeed, Settings, Rescan and Confirm.
 *
 * Behaviour:
 *   - When `needsAuth` holds (at mount, or when a settings toggle flips it
 *     on while the screen stays mounted): asks the gate controller.
 *   - On decline: shows the standard sentence and calls `onCancel`
 *     (typically `navigation.goBack()`).
 *   - On a fail-open: passes, and tells the user why the gate could not
 *     run.
 *
 * Returns a ScreenGateState. Callers render a placeholder until it
 * reaches `passed`, so sensitive content is never visible while a prompt
 * is in flight.
 */
export const useBiometricGate = ({
  needsAuth,
  translate,
  addLastSnackbar,
  onCancel,
}: UseBiometricGateArgs): ScreenGateState => {
  const [screenGate, setScreenGate] = useState<ScreenGateState>(
    needsAuth ? { kind: 'checking' } : { kind: 'passed' },
  );

  // Reactive to needsAuth: the native stack remounts screens per
  // navigation, and a settings toggle can flip the requirement while the
  // screen stays mounted. The cleanup cancels the pending run, so an
  // unmounted or re-gated screen never acts on a stale answer.
  useEffect(() => {
    if (!needsAuth) {
      setScreenGate({ kind: 'passed' });
      return;
    }
    setScreenGate({ kind: 'checking' });
    let cancelled = false;
    (async () => {
      const answer = await askGate({ translate });
      if (cancelled) {
        return;
      }
      const proceed = enactGateAnswer(
        answer,
        {
          lock: () => {
            setScreenGate({ kind: 'refused' });
            // The raw platform diagnostic is bug-report data; the
            // decline path must not paste it into user copy.
            addLastSnackbar(translate('biometrics-error') as string);
            onCancel();
          },
          notice: addLastSnackbar,
        },
        translate,
      );
      if (proceed) {
        setScreenGate({ kind: 'passed' });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAuth]);

  return screenGate;
};
