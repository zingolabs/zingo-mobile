import { useCallback, useContext } from 'react';
import { ContextAppLoaded } from '@app/context';
import { askGate, enactGateAnswer } from '@app/security/gateController';

/**
 * The device lock before a deposit leaves the wallet, asked straight from the
 * press as a send's confirm asks it: the system prompt and nothing before it.
 * Resolves whether to go on; with the lock off it goes on without asking.
 */
export function useAuthorizeDeposit(): () => Promise<boolean> {
  const { translate, addLastSnackbar, biometrics } =
    useContext(ContextAppLoaded);
  return useCallback(async () => {
    if (!biometrics) {
      return true;
    }
    const answer = await askGate({ translate });
    return enactGateAnswer(
      answer,
      {
        lock: () => addLastSnackbar(translate('biometrics-error') as string),
        notice: addLastSnackbar,
      },
      translate,
    );
  }, [biometrics, translate, addLastSnackbar]);
}
