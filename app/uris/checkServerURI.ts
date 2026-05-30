import { ChainNameEnum, GlobalConst } from '../AppState';
import RPCModule from '../RPCModule';
import { RPCInfoType } from '../walletBackend/types/RPCInfoType';

type checkServerURIReturn = {
  result: boolean;
  timeout: boolean;
  newChainName?: ChainNameEnum;
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
    const resultStrServerPromise = RPCModule.changeServerProcess(uri);
    const timeoutServerPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Promise changeserver Timeout 15 seconds'));
      }, 15 * 1000);
    });

    const resultStrServer: string = await Promise.race([
      resultStrServerPromise,
      timeoutServerPromise,
    ]);
    //console.log(resultStrServer);

    if (
      resultStrServer &&
      resultStrServer.toLowerCase().startsWith(GlobalConst.error)
    ) {
      // I have to restore the old server again. Just in case.
      //console.log('changeserver', resultStrServer);
      await RPCModule.changeServerProcess(oldUri);
      // error, no timeout
      return { result: false, timeout: false, newChainName };
    } else {
      // the server is changed
      if (uri) {
        // the new server is not Offline mode.
        // No `await` here so Promise.race can enforce the 15s cap.
        const infoStrPromise = RPCModule.infoServerInfo();
        const timeoutInfoPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Promise info Timeout 15 seconds'));
          }, 15 * 1000);
        });

        const infoStr: string = await Promise.race([
          infoStrPromise,
          timeoutInfoPromise,
        ]);
        //console.log(infoStr);

        if (infoStr && infoStr.toLowerCase().startsWith(GlobalConst.error)) {
          //console.log('info', infoStr);
          // I have to restore the old server again.
          await RPCModule.changeServerProcess(oldUri);
          // error, no timeout
          return { result: false, timeout: false, newChainName };
        } else {
          try {
            const infoJSON: RPCInfoType = await JSON.parse(infoStr);
            newChainName = infoJSON.chain_name;
          } catch (e) {
            //console.log(infoStr);
            // I have to restore the old server again.
            await RPCModule.changeServerProcess(oldUri);
            // error, no timeout
            return { result: false, timeout: false, newChainName };
          }
        }
      } else {
        // the new server is empty -> means Offline mode.
        // No `await` here so Promise.race can enforce the 15s cap.
        const balanceStrPromise = RPCModule.getBalanceInfo();
        const timeoutInfoPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Promise info Timeout 15 seconds'));
          }, 15 * 1000);
        });

        const balanceStr: string = await Promise.race([
          balanceStrPromise,
          timeoutInfoPromise,
        ]);
        //console.log(balanceStr);

        if (
          balanceStr &&
          balanceStr.toLowerCase().startsWith(GlobalConst.error)
        ) {
          //console.log('info', infoStr);
          // I have to restore the old server again.
          await RPCModule.changeServerProcess(oldUri);
          // error, no timeout
          return { result: false, timeout: false, newChainName };
        } else {
          newChainName = undefined;
        }
      }
    }
  } catch (error: unknown) {
    //console.log('catch', error instanceof Error ? error.message : String(error));
    // I have to restore the old server again. Just in case.
    await RPCModule.changeServerProcess(oldUri);
    // error, YES timeout
    return { result: false, timeout: true, newChainName };
  }

  // NO error, no timeout
  return { result: true, timeout: false, newChainName };
};

export default checkServerURI;
