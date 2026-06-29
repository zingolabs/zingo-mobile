import { useCallback, useEffect, useRef, useState } from 'react';

import { SwapService } from '../swap';

export type UseAccountDeleteGuardResult = {
  /** True while the initial / refresh check is in progress. */
  isChecking: boolean;
  /**
   * `true` when there is at least one outbound swap whose deposit tx we have
   * broadcast and that has not yet reached a terminal SwapKit status. `null`
   * means the check has not completed yet or the service is unavailable;
   * callers should treat that as "unknown" (e.g. show a softer warning).
   */
  hasInflightDeposits: boolean | null;
  /** Re-run the check. Safe to call repeatedly; trailing call wins. */
  refresh: () => Promise<void>;
};

/**
 * Pre-deletion guard for wallet-replacement flows.
 *
 * Callers (typically the change-wallet / restore-backup confirmation flow)
 * should consult `hasInflightDeposits` before wiping wallet state. When it is
 * `true`, the user is shown a stronger warning explaining that an outbound
 * swap deposit is mid-flight and that wiping the wallet now will lose the
 * tracking record (the on-chain swap will still complete, but the user will
 * not see it in the activity list of the replacement wallet).
 *
 * The hook is intentionally minimal: it exposes one boolean and a refresh
 * helper. It does not navigate, render alerts, or call the deletion API
 * itself — those concerns stay with the calling screen so the warning copy
 * and routing stay consistent with the rest of the change-wallet UI.
 *
 * `swapService` is passed in (rather than read from context) so this hook can
 * be unit-tested without provider plumbing, and so it can be used before a
 * `SwapServiceContext` is wired into the app. When `null`, the hook resolves
 * to `hasInflightDeposits: null` and `isChecking: false` — i.e. "no opinion".
 */
export function useAccountDeleteGuard(
  swapService: SwapService | null,
): UseAccountDeleteGuardResult {
  const [isChecking, setIsChecking] = useState<boolean>(swapService !== null);
  const [hasInflightDeposits, setHasInflightDeposits] = useState<
    boolean | null
  >(null);

  // Tracks the most recent refresh invocation so a slow earlier check cannot
  // overwrite a faster later result.
  const refreshGeneration = useRef(0);

  const refresh = useCallback(async () => {
    if (!swapService) {
      setHasInflightDeposits(null);
      setIsChecking(false);
      return;
    }
    const myGeneration = ++refreshGeneration.current;
    setIsChecking(true);
    try {
      const result = await swapService.hasInflightDeposits();
      if (myGeneration === refreshGeneration.current) {
        setHasInflightDeposits(result);
      }
    } catch (err) {
      console.log('useAccountDeleteGuard: hasInflightDeposits failed:', err);
      if (myGeneration === refreshGeneration.current) {
        // Fall back to `null` (unknown) on error rather than `false`, so we
        // do not silently green-light deletion when persistence is flaky.
        setHasInflightDeposits(null);
      }
    } finally {
      if (myGeneration === refreshGeneration.current) {
        setIsChecking(false);
      }
    }
  }, [swapService]);

  useEffect(() => {
    refresh().catch(() => {
      // refresh swallows its own errors; this catch only exists for the
      // fire-and-forget invocation under the effect.
    });
  }, [refresh]);

  return { isChecking, hasInflightDeposits, refresh };
}
