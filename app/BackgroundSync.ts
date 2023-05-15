import RPCModule from './RPCModule';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';
import { RPCSyncStatusType } from './rpc/types/RPCSyncStatusType';

const BackgroundSync = async (task_data: any) => {
  const exists = await RPCModule.walletExists();

  // only if exists the wallet file make sense to do the sync.
  if (exists && exists !== 'false') {
    // only if we have connection make sense to call RPCModule.
    const network = await NetInfo.fetch();
    if (!network.isConnected) {
      console.log('BS: Not started (connected: ' + network.isConnected + ', type: ' + network.type + ')');
      return;
    }
    const server = await AsyncStorage.getItem('@server');
    let wallet: string = await RPCModule.loadExistingWallet(server);
    if (wallet) {
      if (wallet.toLowerCase().startsWith('error')) {
        // We don't return an error message yet, just log the error and return
        console.log(`BS: Error load wallet ${wallet}`);
        return;
      }
    } else {
      console.log('BS: Internal Error load wallet');
      return;
    }

    let batch_num = -1;
    console.log('BS:', task_data);

    // finishEarly has two fields: wait, and done.
    // wait() returns a promise, which is resolved when
    // done() is called
    let finishEarly = manuallyResolve();

    let saver = setInterval(async () => {
      const networkState = await NetInfo.fetch();
      if (
        !networkState.isConnected ||
        networkState.type === NetInfoStateType.cellular ||
        (networkState.details !== null && networkState.details.isConnectionExpensive)
      ) {
        console.log(
          'BS: Interrupted (connected: ' + networkState.isConnected,
          +', type: ' +
            networkState.type +
            +', expensive connection: ' +
            networkState.details?.isConnectionExpensive +
            ')',
        );
        clearInterval(saver);
        finishEarly.done();
        return;
      }
      // if the App goes to Foreground kill the interval
      const background = await AsyncStorage.getItem('@background');
      if (background === 'no') {
        clearInterval(saver);
        console.log('BS: Finished (going to foreground)');
        finishEarly.done();
        return;
      }

      const syncStatusStr: string = await RPCModule.execute('syncstatus', '');
      if (syncStatusStr) {
        if (syncStatusStr.toLowerCase().startsWith('error')) {
          console.log(`BS: Error sync status ${syncStatusStr}`);
          return;
        }
      } else {
        console.log('BS: Internal Error sync status');
        return;
      }
      // TODO: verify this JSON parse
      const ss: RPCSyncStatusType = await JSON.parse(syncStatusStr);

      console.log('BS:', ss);
      if (ss.batch_num && ss.batch_num > -1 && batch_num !== ss.batch_num) {
        await RPCModule.doSave();
        console.log('BS: saving...');
        // update batch_num with the new value, otherwise never change
        batch_num = ss.batch_num;
      }
    }, 5000);

    await Promise.race([RPCModule.execute('sync', ''), finishEarly.wait()]);
    clearInterval(saver);
  } else {
    console.log('BS: wallet file does not exist');
  }
  console.log('BS: Finished (end of syncing)');
};

export default BackgroundSync;

function manuallyResolve() {
  let resolve: Function;
  // new Promise takes a function as an argument. When that function is called
  // the promise resolves with the value output by that function.
  // By passing the function out of the promise, we can call it later
  // in order to resolve the promise at will
  const promise = new Promise(fun => {
    resolve = fun;
  });

  function done() {
    resolve();
  }

  function wait() {
    return promise;
  }

  return { wait, done };
}
