import { useContext, useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { ContextAppLoaded } from '@app/context';
import { planOrchardDrain } from '@app/walletBackend';
import { RPCDrainPlanType } from '@app/walletBackend/types/RPCDrainPlanType';
import { parseJson } from '@app/utils/parseJson';

/**
 * Whether Orchard holds only a residual: value that costs more in fees to
 * move than it carries, so the drain plans no transaction for it. Read on
 * focus and on every new block.
 */
export function useOrchardResidualOnly(): boolean {
  const { info } = useContext(ContextAppLoaded);
  const height = info?.latestBlock ?? 0;
  const [residualOnly, setResidualOnly] = useState<boolean>(false);
  const focused = useIsFocused();

  // `height` is a trigger: a new block can confirm notes.
  useEffect(() => {
    if (!focused) {
      return;
    }
    let cancelled = false;
    (async () => {
      const planned = await planOrchardDrain();
      if (cancelled || !planned.ok) {
        return;
      }
      // A plan that fails to parse is transient; the last reading stays.
      const plan = parseJson<RPCDrainPlanType>(planned.value);
      if (plan && !plan.error) {
        setResidualOnly(
          (plan.transactions?.length ?? 0) === 0 && (plan.residual ?? 0) > 0,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [focused, height]);

  return residualOnly;
}
