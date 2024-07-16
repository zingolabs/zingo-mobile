import { ChainNameEnum, CommandEnum, GlobalConst } from '../AppState';
import RPCModule from '../RPCModule';
import { RPCInfoType } from '../rpc/types/RPCInfoType';

type checkServerURIReturn = {
  result: boolean;
  timeout: boolean;
  newChainName?: ChainNameEnum;
};

const checkServerURI = async (uri: string, oldUri: string): Promise<checkServerURIReturn> => {
  let newChainName: ChainNameEnum | undefined;

  try {
    const resultStrServerPromise = RPCModule.execute(CommandEnum.changeserver, uri);
    const timeoutServerPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Promise changeserver Timeout 30 seconds'));
      }, 30000);
    });

    const resultStrServer: string = await Promise.race([resultStrServerPromise, timeoutServerPromise]);

    if (!resultStrServer || resultStrServer.toLowerCase().startsWith(GlobalConst.error)) {
      // I have to restore the old server again. Just in case.
      //console.log('changeserver', resultStrServer);
      await RPCModule.execute(CommandEnum.changeserver, oldUri);
      // error, no timeout
      return { result: false, timeout: false, newChainName };
    } else {
      // the server is changed
      const infoStrPromise = RPCModule.execute(CommandEnum.info, '');
      const timeoutInfoPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Promise info Timeout 30 seconds'));
        }, 30000);
      });

      const infoStr: string = await Promise.race([infoStrPromise, timeoutInfoPromise]);

      if (!infoStr || infoStr.toLowerCase().startsWith(GlobalConst.error)) {
        //console.log('info', infoStr);
        // I have to restore the old server again.
        await RPCModule.execute(CommandEnum.changeserver, oldUri);
        // error, no timeout
        return { result: false, timeout: false, newChainName };
      } else {
        try {
          const infoJSON: RPCInfoType = await JSON.parse(infoStr);
          newChainName = infoJSON.chain_name;
        } catch (e) {
          console.log(infoStr);
          // I have to restore the old server again.
          await RPCModule.execute(CommandEnum.changeserver, oldUri);
          // error, no timeout
          return { result: false, timeout: false, newChainName };
        }
      }
    }
  } catch (error: any) {
    //console.log('catch', error);
    // I have to restore the old server again. Just in case.
    await RPCModule.execute(CommandEnum.changeserver, oldUri);
    // error, YES timeout
    return { result: false, timeout: true, newChainName };
  }

  // NO error, no timeout
  return { result: true, timeout: false, newChainName };
};

export default checkServerURI;
