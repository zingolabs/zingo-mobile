import { useEffect, useRef, useState } from 'react';

import simpleBiometrics from '../simpleBiometrics';
import { SnackbarDurationEnum, TranslateType } from '../AppState';
import Utils from '../utils';

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
 *   - When `needsAuth` holds (at mount, or when a settings toggle flips it
 *     on while the screen stays mounted): triggers simpleBiometrics.
 *   - On decline: reports what the platform said (the rendered failure,
 *     appended to the standard sentence) and calls `onCancel` (typically
 *     `navigation.goBack()`).
 *   - On a stalled fail-open: passes, and tells the user the check did not
 *     respond.
 *   - On `unanswered` (a shared run's decline answered another purpose):
 *     re-asks, but only while this screen is still mounted, so no prompt
 *     is ever raised on behalf of a dead component.
 *   - On background → active (foregroundEpoch bumps): re-fires the gate
 *     only when `foregroundAppEnabled` is false. LoadedApp's own
 *     foreground gate already covers the enabled case.
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

  // The one gate body both effects run: returns the effect cleanup that
  // cancels it, so an unmounted or re-gated screen never acts on a stale
  // verdict and never re-asks for one.
  const runScreenGate = () => {
    let cancelled = false;
    (async () => {
      let verdict = await simpleBiometrics({
        translate,
        purpose: 'screenEntry',
      });
      while (verdict.kind === 'unanswered' && !cancelled) {
        verdict = await simpleBiometrics({ translate, purpose: 'screenEntry' });
      }
      if (cancelled || verdict.kind === 'unanswered') {
        return;
      }
      if (verdict.kind === 'declined') {
        addLastSnackbar(
          `${translate('biometrics-error') as string} ${Utils.renderErrorKeyed(
            verdict.failure,
            translate,
          )}`,
        );
        onCancel();
        return;
      }
      if (
        verdict.kind === 'unavailable' &&
        verdict.failure.errorKey === 'biometrics-failure-stalled'
      ) {
        // Passing is the fail-open policy for a gate that could not run,
        // and the user should hear that the check did not respond.
        addLastSnackbar(Utils.renderErrorKeyed(verdict.failure, translate));
      }
      setAuthPassed(true);
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
      setAuthPassed(true);
      return;
    }
    setAuthPassed(false);
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
    setAuthPassed(false);
    return runScreenGate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foregroundEpoch]);

  return authPassed;
};
