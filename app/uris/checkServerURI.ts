import { ChainNameEnum } from '../AppState';
import { changeServer, getBalanceInfo, getServerInfo } from '../walletBackend';
import { RPCInfoType } from '../walletBackend/types/RPCInfoType';

type checkServerURIReturn = {
  result: boolean;
  timeout: boolean;
  newChainName?: ChainNameEnum;
  // Raw native/JS error string from whichever step failed. Surfaced so the
  // caller can append it to the user-facing snackbar — the existing
  // `changeservernew-error` translation only says "trying to change the
  // server" and gives no clue about *why* (TLS handshake, gRPC unavailable,
  // wallet-chain mismatch, etc.). Undefined on success.
  errorDetail?: string;
};

const checkServerURI = async (
  uri: string,
  oldUri: string,
): Promise<checkServerURIReturn> => {
  let newChainName: ChainNameEnum | undefined;

  try {
    // The variable must hold the Promise itself (no `await` here) so that
    // Promise.race can actually race it against the timeout. With `await`
    // the call resolves before the race starts and the 15s timer is moot —
    // a failing RPC then blocks for as long as the native side decides
    // (observed ~4 min in the wild instead of the intended 15s cap).
    const resultServerPromise = changeServer(uri);
    const timeoutServerPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Promise changeserver Timeout 15 seconds'));
      }, 15 * 1000);
    });

    const resultServer = await Promise.race([
      resultServerPromise,
      timeoutServerPromise,
    ]);

    if (!resultServer.ok) {
      // I have to restore the old server again. Just in case.
      await changeServer(oldUri);
      // error, no timeout
      return {
        result: false,
        timeout: false,
        newChainName,
        errorDetail: `changeServer: ${resultServer.error.message}`,
      };
    } else {
      // the server is changed
      if (uri) {
        // the new server is not Offline mode.
        // No `await` here so Promise.race can enforce the 15s cap.
        const infoPromise = getServerInfo();
        const timeoutInfoPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Promise info Timeout 15 seconds'));
          }, 15 * 1000);
        });

        const info = await Promise.race([infoPromise, timeoutInfoPromise]);

        if (!info.ok) {
          // I have to restore the old server again.
          await changeServer(oldUri);
          // error, no timeout
          return {
            result: false,
            timeout: false,
            newChainName,
            errorDetail: `infoServerInfo: ${info.error.message}`,
          };
        } else {
          try {
            const infoJSON: RPCInfoType = await JSON.parse(info.value);
            newChainName = infoJSON.chain_name;
          } catch (e) {
            // I have to restore the old server again.
            await changeServer(oldUri);
            // error, no timeout
            return {
              result: false,
              timeout: false,
              newChainName,
              errorDetail: `infoServerInfo parse: ${
                e instanceof Error ? e.message : String(e)
              } | raw: ${info.value}`,
            };
          }
        }
      } else {
        // the new server is empty -> means Offline mode.
        // No `await` here so Promise.race can enforce the 15s cap.
        const balancePromise = getBalanceInfo();
        const timeoutInfoPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Promise info Timeout 15 seconds'));
          }, 15 * 1000);
        });

        const balance = await Promise.race([
          balancePromise,
          timeoutInfoPromise,
        ]);

        if (!balance.ok) {
          // I have to restore the old server again.
          await changeServer(oldUri);
          // error, no timeout
          return {
            result: false,
            timeout: false,
            newChainName,
            errorDetail: `getBalanceInfo: ${balance.error.message}`,
          };
        } else {
          newChainName = undefined;
        }
      }
    }
  } catch (error: unknown) {
    // I have to restore the old server again. Just in case.
    await changeServer(oldUri);
    // error, YES timeout
    return {
      result: false,
      timeout: true,
      newChainName,
      errorDetail: error instanceof Error ? error.message : String(error),
    };
  }

  // NO error, no timeout
  return { result: true, timeout: false, newChainName };
};

export default checkServerURI;
