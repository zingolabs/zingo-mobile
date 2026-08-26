import { useEffect, useRef, useState } from 'react';

import simpleBiometrics, {
  AnsweredVerdict,
  returnedToForeground,
} from '../simpleBiometrics';
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

/** The screen gate's named states, so callers never read a bare boolean. */
export type ScreenGateState =
  { kind: 'checking' } | { kind: 'passed' } | { kind: 'refused' };

/**
 * Audit Issue D — single source of truth for the screen-level biometric
 * gate used by Seed, ShowUfvk, Settings, Rescan and Confirm.
 *
 * Behaviour:
 *   - When `needsAuth` holds (at mount, or when a settings toggle flips it
 *     on while the screen stays mounted): triggers simpleBiometrics.
 *   - On decline: shows the standard sentence, appending the rendered
 *     failure only for the stalled key, and calls `onCancel` (typically
 *     `navigation.goBack()`).
 *   - On a stalled fail-open: passes, and tells the user the check did not
 *     respond.
 *   - On `unanswered` (a shared appEntry run declined, locking the app):
 *     waits out the bounded return-to-foreground hold, then re-asks only
 *     if this screen still exists, so no prompt is ever raised on behalf
 *     of a component being torn down. The type enforces the no-action
 *     rule: only an AnsweredVerdict reaches the acting code.
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

  // Only an answered verdict may act; `unanswered` cannot reach this code.
  const enactScreenVerdict = (verdict: AnsweredVerdict) => {
    if (verdict.kind === 'declined') {
      setScreenGate({ kind: 'refused' });
      // The raw diagnostic is bug-report data. Only the stalled key earns
      // a place in user copy, because there the sentence is the sole
      // trace the wedged-queue class leaves.
      addLastSnackbar(
        verdict.failure.errorKey === 'biometrics-failure-stalled'
          ? `${translate('biometrics-error') as string} ${Utils.renderGateFailure(
              verdict.failure,
              translate,
            )}`
          : (translate('biometrics-error') as string),
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
      addLastSnackbar(Utils.renderGateFailure(verdict.failure, translate));
    }
    setScreenGate({ kind: 'passed' });
  };

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
      // 'unanswered' means an appEntry decline is locking the app, which
      // usually tears this screen down; the bounded wait gives that
      // teardown time to cancel this run. Where no teardown comes, the
      // re-ask restores the screen's own gate instead of parking it.
      while (verdict.kind === 'unanswered' && !cancelled) {
        await returnedToForeground();
        if (cancelled) {
          return;
        }
        verdict = await simpleBiometrics({
          translate,
          purpose: 'screenEntry',
        });
      }
      if (cancelled || verdict.kind === 'unanswered') {
        return;
      }
      enactScreenVerdict(verdict);
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
