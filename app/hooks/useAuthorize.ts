import { useCallback, useContext } from 'react';
import { ContextAppLoaded } from '@app/context';
import { authorizeAction } from '@app/services/gateController';

/**
 * The one gate every sensitive action asks from its press: revealing a
 * secret, funds leaving, or an act that cannot be undone. Resolves whether
 * to go on, without asking when the biometrics switch is off.
 */
export function useAuthorize(): () => Promise<boolean> {
  const { translate, addLastSnackbar, biometrics } =
    useContext(ContextAppLoaded);
  return useCallback(
    () =>
      authorizeAction({
        enabled: biometrics,
        translate,
        notify: addLastSnackbar,
      }),
    [biometrics, translate, addLastSnackbar],
  );
}
