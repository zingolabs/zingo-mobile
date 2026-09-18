import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  batteryRestricted,
  hasMakerPowerSettings,
} from '@app/notifications/reminders';

/**
 * Whether the system optimizes the app's battery (Android), which on
 * aggressive OEM builds means the app gets force stopped and its reminders
 * wiped, and whether the maker has its own power-manager screen to exempt it
 * in. `restricted` is `null` until known, so nothing is shown before then.
 *
 * Re-read whenever the app returns to the foreground: the exemption is
 * granted in the system settings, outside the app.
 */
export function useBatteryRestriction(): {
  restricted: boolean | null;
  makerSettings: boolean;
} {
  const [restricted, setRestricted] = useState<boolean | null>(null);
  const [makerSettings, setMakerSettings] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const read = () => {
      batteryRestricted()
        .then(value => {
          if (!cancelled) {
            setRestricted(value);
          }
        })
        .catch(() => {
          // Unreadable: keep whatever was last known.
        });
      hasMakerPowerSettings()
        .then(value => {
          if (!cancelled) {
            setMakerSettings(value);
          }
        })
        .catch(() => {});
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
  }, []);

  return { restricted, makerSettings };
}
