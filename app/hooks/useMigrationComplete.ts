import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { migrationStatus } from '@app/walletBackend';
import { RPCMigrationStatusType } from '@app/walletBackend/types/RPCMigrationStatusType';

/**
 * Whether the Orchard → Ironwood migration is complete, read on focus. What
 * Orchard still holds after it is the residual.
 */
export function useMigrationComplete(): boolean {
  const [complete, setComplete] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const status = await migrationStatus();
        if (cancelled || !status.ok) {
          return;
        }
        try {
          const parsed = JSON.parse(status.value) as RPCMigrationStatusType;
          if (!parsed.error) {
            setComplete(parsed.phase?.kind === 'complete');
          }
        } catch {
          // Transient; keep what was read last.
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return complete;
}
