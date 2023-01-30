import RPCModule from '../components/RPCModule';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BackgroundSync = async (task_data: any) => {
  const exists = await RPCModule.walletExists();

  // only if exists the wallet file make sense to do the sync.
  if (exists && exists !== 'false') {
    const server = await AsyncStorage.getItem('@server');
    let wallet = await RPCModule.loadExistingWallet(server);
    if (wallet.startsWith('Error')) {
      // We don't return an error message yet, just log the error and return
      console.error(wallet);
      return;
    }
    let batch_num = -1;
    console.log('BS:', task_data);

    let saver = setInterval(async () => {
      // if the App goes to Foreground kill the interval
      const background = await AsyncStorage.getItem('@background');
      if (background === 'no') {
        clearInterval(saver);
        console.log('BS: Finished (foreground)');
        return;
      }

      const s = await RPCModule.execute('syncstatus', '');
      if (!s) {
        return;
      }
      const ss = await JSON.parse(s);
      console.log('BS:', ss);
      if (ss.batch_num > -1 && batch_num !== ss.batch_num) {
        await RPCModule.doSave();
        console.log('BS: saving...');
        // update batch_num with the new value, otherwise never change
        batch_num = ss.batch_num;
      }
    }, 2000);

    await RPCModule.execute('sync', '');
    clearInterval(saver);
  }
  console.log('BS: FInished (end)');
};

export default BackgroundSync;
