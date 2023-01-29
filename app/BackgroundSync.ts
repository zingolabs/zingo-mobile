import RPCModule from '../components/RPCModule';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BackgroundSync = async (task_data: any) => {
  const exists = await RPCModule.walletExists();

  // only if exists the wallet file make sense to do the sync.
  if (exists && exists !== 'false') {
    // the initial value from synstatus is 0
    let sync_id = -1;
    console.log('BS:', task_data);

    let saver = setInterval(async () => {
      // if the App goes to Foreground kill the interval
      const background = await AsyncStorage.getItem('@background');
      if (background === 'no') {
        clearInterval(saver);
        console.log('BS: FInished (foreground)');
        return;
      }

      const s = await RPCModule.execute('syncstatus', '');
      if (!s) {
        return;
      }
      const ss = await JSON.parse(s);
      console.log('BS:', ss);
      if (sync_id > -1 && sync_id !== ss.sync_id) {
        await RPCModule.doSave();
        console.log('BS: saving...');
        // update sync_id with the new value, otherwise never change
        sync_id = ss.sync_id;
      }
    }, 2000);

    await RPCModule.execute('sync', '');
    clearInterval(saver);
  }
  console.log('BS: FInished (end)');
};

export default BackgroundSync;
