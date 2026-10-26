import { useCallback, useContext, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ContextAppLoaded } from '@app/context';
import { planOrchardDrain } from '@app/walletBackend';
import { RPCDrainPlanType } from '@app/walletBackend/types/RPCDrainPlanType';

/**
 * Whether Orchard holds only a residual: value that costs more in fees to
 * move than it carries, so the drain plans no transaction for it. Read on
 * focus and on every new block.
 */
export function useOrchardResidualOnly(): boolean {
  const { info } = useContext(ContextAppLoaded);
  const height = info?.latestBlock ?? 0;
  const [residualOnly, setResidualOnly] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const planned = await planOrchardDrain();
        if (cancelled || !planned.ok) {
          return;
        }
        try {
          const plan = JSON.parse(planned.value) as RPCDrainPlanType;
          if (!plan.error) {
            setResidualOnly(
              (plan.transactions?.length ?? 0) === 0 &&
                (plan.residual ?? 0) > 0,
            );
          }
        } catch {
          // Transient; keep what was read last.
        }
      })();
      return () => {
        cancelled = true;
      };
      // `height` is a trigger: a new block can confirm notes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [height]),
  );

  return residualOnly;
}
