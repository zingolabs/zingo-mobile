import { useCallback, useContext, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ContextAppLoaded } from '@app/context';
import { migrationStatus, planIronwoodMigration } from '@app/walletBackend';
import { RPCMigrationStatusType } from '@app/walletBackend/types/RPCMigrationStatusType';
import { RPCMigrationPlanType } from '@app/walletBackend/types/RPCMigrationPlanType';

const parse = <T extends { error?: string }>(json: string): T | null => {
  try {
    const parsed = JSON.parse(json) as T;
    return parsed.error ? null : parsed;
  } catch {
    return null;
  }
};

/**
 * Whether Orchard holds only a residual: value that costs more in fees to
 * move than it carries. True once the migration is complete, or when no
 * migration is under way and the planner finds nothing worth moving. A
 * migration in flight, or a plan with parts, is real funds to migrate.
 * Read on focus and on every new block.
 */
export function useOrchardResidualOnly(): boolean {
  const { info } = useContext(ContextAppLoaded);
  const height = info?.latestBlock ?? 0;
  const [residualOnly, setResidualOnly] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const status = await migrationStatus();
        if (cancelled || !status.ok) {
          return;
        }
        const migration = parse<RPCMigrationStatusType>(status.value);
        if (!migration) {
          return;
        }
        if (migration.phase) {
          setResidualOnly(migration.phase.kind === 'complete');
          return;
        }
        const planned = await planIronwoodMigration();
        if (cancelled || !planned.ok) {
          return;
        }
        const plan = parse<RPCMigrationPlanType>(planned.value);
        if (plan) {
          setResidualOnly(
            (plan.parts?.length ?? 0) === 0 && (plan.residual ?? 0) > 0,
          );
        }
      })();
      return () => {
        cancelled = true;
      };
      // `height` is a trigger: a new block can confirm notes or end a migration.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [height]),
  );

  return residualOnly;
}
