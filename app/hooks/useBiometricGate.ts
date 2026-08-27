import { useEffect, useRef, useState } from 'react';

import { askGate, enactGateAnswer } from '../gateController';
import { SnackbarDurationEnum, TranslateType } from '../AppState';

type UseBiometricGateArgs = {
  needsAuth: boolean;
  translate: (key: string) => TranslateType;
  addLastSnackbar: (message: string, duration?: SnackbarDurationEnum) => void;
  onCancel: () => void;
  foregroundAppEnabled: boolean;
  foregroundEpoch: number;
};

/** The screen gate's named states, so callers never read a bare boolean. */
export type ScreenGateState =
  { kind: 'checking' } | { kind: 'passed' } | { kind: 'refused' };

/**
 * Audit Issue D — single source of truth for the screen-level biometric
 * gate used by Seed, ShowUfvk, Settings, Rescan and Confirm.
 *
 * Behaviour (ADR 0007):
 *   - When `needsAuth` holds (at mount, or when a settings toggle flips it
 *     on while the screen stays mounted): asks the gate controller.
 *   - On decline: shows the standard sentence and calls `onCancel`
 *     (typically `navigation.goBack()`).
 *   - On a fail-open: passes, and tells the user why the gate could not
 *     run.
 *   - On background → active (foregroundEpoch bumps): re-fires the gate
 *     only when `foregroundAppEnabled` is false. LoadedApp's own
 *     foreground gate already covers the enabled case.
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
  foregroundAppEnabled,
  foregroundEpoch,
}: UseBiometricGateArgs): ScreenGateState => {
  const [screenGate, setScreenGate] = useState<ScreenGateState>(
    needsAuth ? { kind: 'checking' } : { kind: 'passed' },
  );

  // The one gate body both effects run: returns the effect cleanup that
  // cancels it, so an unmounted or re-gated screen never acts on a stale
  // answer.
  const runScreenGate = () => {
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
  };

  // Reactive to needsAuth: the native stack remounts screens per
  // navigation, and a settings toggle can flip the requirement while the
  // screen stays mounted; both paths re-gate here.
  useEffect(() => {
    if (!needsAuth) {
      setScreenGate({ kind: 'passed' });
      return;
    }
    setScreenGate({ kind: 'checking' });
    return runScreenGate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAuth]);

  // Re-fire on background → active. Skips the initial render so the
  // effect above isn't duplicated.
  const isFirstEpochRef = useRef(true);
  useEffect(() => {
    if (isFirstEpochRef.current) {
      isFirstEpochRef.current = false;
      return;
    }
    if (!needsAuth || foregroundAppEnabled) {
      return;
    }
    setScreenGate({ kind: 'checking' });
    return runScreenGate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foregroundEpoch]);

  return screenGate;
};
