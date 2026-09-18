import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { reminderPermissionGranted } from '@app/notifications/reminders';

/**
 * Whether batch reminders may notify, read without prompting, and a `refresh`
 * to re-read it after something may have changed it. `null` until the first
 * read lands (or while it cannot be read), so callers neither promise
 * reminders nor say they are off before they know.
 *
 * Re-read whenever the app returns to the foreground: the permission is
 * granted or revoked in the system settings, outside the app.
 */
export function useReminderPermission(): {
  permitted: boolean | null;
  refresh: () => void;
} {
  const [permitted, setPermitted] = useState<boolean | null>(null);
  const [tick, setTick] = useState<number>(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const read = () => {
      reminderPermissionGranted()
        .then(granted => {
          if (!cancelled) {
            setPermitted(granted);
          }
        })
        .catch(() => {
          // Unreadable: keep whatever was last known.
        });
    };
    read();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        read();
      }
    });
    return () => {
      cancelled = true;
      // Optional: Jest's react-native preset stubs addEventListener to
      // return nothing.
      subscription?.remove();
    };
  }, [tick]);

  return { permitted, refresh };
}
