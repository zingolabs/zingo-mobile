import Url from 'url-parse';
import RPCModule from '../RPCModule';

const checkServerURI = async (uri: string, oldUri: string, setDisabled: (s: boolean) => void): Promise<boolean> => {
  const parsedUri = new Url(uri, true);

  let port = parsedUri.port;

  if (!port) {
    // by default -> 9067
    // for `zecwallet` -> 443
    port = uri.includes('lwdv3.zecwallet') ? '443' : '9067';
  }

  console.log(`BEFORE checking server: ${parsedUri.protocol}//${parsedUri.hostname}:${port}`);

  // I will give it 30 seconds to try to connect
  // in my tests I waited a few minutes until I get a timeout
  // I don't understand this.
  let task = setTimeout(async () => {
    console.log('BEFORE restore server exit in 30s');
    await RPCModule.execute('changeserver', oldUri);
    console.log('AFTER restore server exit in 30s');
    setDisabled(false);
  }, 30000);
  const resultStrServer: string = await RPCModule.execute(
    'changeserver',
    `${parsedUri.protocol}//${parsedUri.hostname}:${port}`,
  );
  console.log(resultStrServer);
  console.log(`AFTER checking server: ${parsedUri.protocol}//${parsedUri.hostname}:${port}`);
  if (resultStrServer.toLowerCase().startsWith('error')) {
    console.log(`Error when change server ${resultStrServer}`);
    // I have to restore the old server again. Just in case.
    await RPCModule.execute('changeserver', oldUri);
    clearTimeout(task);
    return false;
  } else {
    // the server is changed
    console.log('BEFORE info');
    const infoStr: string = await RPCModule.execute('info', '');
    console.log(infoStr);
    console.log('AFTER info');
    if (infoStr.toLowerCase().startsWith('error')) {
      console.log('error in info when change server', infoStr);
      // I have to restore the old server again.
      await RPCModule.execute('changeserver', oldUri);
      clearTimeout(task);
      return false;
    }
  }

  clearTimeout(task);
  return true;
};

export default checkServerURI;
