import Url from 'url-parse';
import RPCModule from '../RPCModule';
import { RPCInfoType } from '../rpc/types/RPCInfoType';

type checkServerURIReturn = {
  result: boolean;
  timeout: boolean;
  new_chain_name?: string;
};

const checkServerURI = async (uri: string, oldUri: string): Promise<checkServerURIReturn> => {
  const parsedUri = new Url(uri, true);

  let port = parsedUri.port;
  let new_chain_name: string | undefined;

  if (!port) {
    // by default -> 9067
    // for `zecwallet` -> 443
    port = uri.includes('lwdv3.zecwallet') ? '443' : '9067';
  }

  try {
    const resultStrServerPromise = RPCModule.execute(
      'changeserver',
      `${parsedUri.protocol}//${parsedUri.hostname}:${port}`,
    );
    const timeoutServerPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Promise changeserver Timeout 30 seconds'));
      }, 30000);
    });

    const resultStrServer: string = await Promise.race([resultStrServerPromise, timeoutServerPromise]);

    if (!resultStrServer || resultStrServer.toLowerCase().startsWith('error')) {
      // I have to restore the old server again. Just in case.
      //console.log('changeserver', resultStrServer);
      await RPCModule.execute('changeserver', oldUri);
      // error, no timeout
      return { result: false, timeout: false, new_chain_name };
    } else {
      // the server is changed
      const infoStrPromise = RPCModule.execute('info', '');
      const timeoutInfoPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Promise info Timeout 30 seconds'));
        }, 30000);
      });

      const infoStr: string = await Promise.race([infoStrPromise, timeoutInfoPromise]);

      if (!infoStr || infoStr.toLowerCase().startsWith('error')) {
        //console.log('info', infoStr);
        // I have to restore the old server again.
        await RPCModule.execute('changeserver', oldUri);
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
    await RPCModule.execute('changeserver', oldUri);
    // error, YES timeout
    return { result: false, timeout: true, new_chain_name };
  }

  // NO error, no timeout
  return { result: true, timeout: false, new_chain_name };
};

export default checkServerURI;
