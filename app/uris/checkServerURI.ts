import Url from 'url-parse';
import RPCModule from '../RPCModule';

const checkServerURI = async (uri: string, oldUri: string): Promise<boolean> => {
  const parsedUri = new Url(uri, true);

  let port = parsedUri.port;

  if (!port) {
    // by default -> 9067
    // for `zecwallet` -> 443
    port = uri.includes('zecwallet') ? '443' : '9067';
  }

  console.log(`${parsedUri.protocol}//${parsedUri.hostname}:${port}`);

  const resultStrServer: string = await RPCModule.execute(
    'changeserver',
    `${parsedUri.protocol}//${parsedUri.hostname}:${port}`,
  );
  if (resultStrServer.toLowerCase().startsWith('error')) {
    console.log(`Error when change server ${resultStrServer}`);
    return false;
  } else {
    // the server is changed
    const infoStr: string = await RPCModule.execute('info', '');
    if (infoStr.toLowerCase().startsWith('error')) {
      console.log('error in info when change server', infoStr);
      // I have to restore the old server again.
      await RPCModule.execute('changeserver', oldUri);
      return false;
    }
  }

  return true;
};

export default checkServerURI;
