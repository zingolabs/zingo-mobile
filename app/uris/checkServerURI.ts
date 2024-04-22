import { CommandEnum } from '../AppState';
import RPCModule from '../RPCModule';
import { RPCInfoType } from '../rpc/types/RPCInfoType';

type checkServerURIReturn = {
  result: boolean;
  timeout: boolean;
  new_chain_name?: 'main' | 'test' | 'regtest';
};

const checkServerURI = async (uri: string, oldUri: string): Promise<checkServerURIReturn> => {
  let new_chain_name: 'main' | 'test' | 'regtest' | undefined;

  try {
    const resultStrServerPromise = RPCModule.execute(CommandEnum.changeserver, uri);
    const timeoutServerPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Promise changeserver Timeout 30 seconds'));
      }, 30000);
    });

    const resultStrServer: string = await Promise.race([resultStrServerPromise, timeoutServerPromise]);

    if (!resultStrServer || resultStrServer.toLowerCase().startsWith('error')) {
      // I have to restore the old server again. Just in case.
      //console.log('changeserver', resultStrServer);
      await RPCModule.execute(CommandEnum.changeserver, oldUri);
      // error, no timeout
      return { result: false, timeout: false, new_chain_name };
    } else {
      // the server is changed
      const infoStrPromise = RPCModule.execute(CommandEnum.info, '');
      const timeoutInfoPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Promise info Timeout 30 seconds'));
        }, 30000);
      });

      const infoStr: string = await Promise.race([infoStrPromise, timeoutInfoPromise]);

      if (!infoStr || infoStr.toLowerCase().startsWith('error')) {
        //console.log('info', infoStr);
        // I have to restore the old server again.
        await RPCModule.execute(CommandEnum.changeserver, oldUri);
        // error, no timeout
        return { result: false, timeout: false, new_chain_name };
      } else {
        const infoJSON: RPCInfoType = await JSON.parse(infoStr);
        new_chain_name = infoJSON.chain_name;
      }
    }
  } catch (error: any) {
    //console.log('catch', error);
    // I have to restore the old server again. Just in case.
    await RPCModule.execute(CommandEnum.changeserver, oldUri);
    // error, YES timeout
    return { result: false, timeout: true, new_chain_name };
  }

  // NO error, no timeout
  return { result: true, timeout: false, new_chain_name };
};

export default checkServerURI;
