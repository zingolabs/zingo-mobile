import { useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';

type ScreenSecurityAPI = {
  setSecure(secure: boolean): Promise<boolean>;
};

const ScreenSecurity = NativeModules.ScreenSecurity as
  | ScreenSecurityAPI
  | undefined;

const supported = Platform.OS === 'android' && !!ScreenSecurity;

// FLAG_SECURE lives on the Activity window, so two secure screens mounted at
// once (Seed pushed over an already-secure screen) have to agree on when it
// comes back off. Last one out clears it.
let holders = 0;

/**
 * Blocks screenshots, screen recording and the recents thumbnail while the
 * calling screen is mounted. Android only — iOS has no equivalent flag.
 *
 * Scoped on purpose: the audit-mandated FLAG_SECURE used to be set once in
 * MainActivity.onCreate and never cleared, so History and Home were
 * capture-proof too. Only screens that render recovery material need it.
 *
 * Returns false until the window flag is confirmed applied. Callers render a
 * placeholder until then, so no frame containing recovery material can reach
 * the compositor before the flag lands. Always true where there is nothing to
 * wait for (iOS, or `enabled` false).
 */
export const useSecureScreen = (enabled = true): boolean => {
  const [applied, setApplied] = useState(!supported || !enabled);

  useEffect(() => {
    if (!enabled || !ScreenSecurity || Platform.OS !== 'android') {
      setApplied(true);
      return;
    }
    let live = true;
    holders += 1;
    // Requested on every mount, not only on the 0 -> 1 edge. The native side
    // is idempotent, and a screen mounting on top of an already-secure one
    // still needs its own confirmation before it renders.
    ScreenSecurity.setSecure(true).then(() => {
      if (live) {
        setApplied(true);
      }
    });
    return () => {
      live = false;
      setApplied(false);
      // Clamped: Fast Refresh re-evaluates this module and resets the counter
      // to zero under mounted holders. Going negative would strand the window
      // secure forever.
      holders = Math.max(0, holders - 1);
      if (holders === 0) {
        ScreenSecurity.setSecure(false);
      }
    };
  }, [enabled]);

  return applied;
};
