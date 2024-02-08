import RPCModule from './RPCModule';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import notifee, { Notification } from '@notifee/react-native';
import { RPCSyncStatusType } from './rpc/types/RPCSyncStatusType';

const BackgroundSync = ((notif: Notification) => {
  return new Promise((resolve, reject) => {
    RPCModule.walletExists().then((exists: boolean) => {
      if (!exists) {
        reject("no wallet file to sync")
      }
      return NetInfo.fetch();
    }).then((networkState: NetInfoState) => {
      if (
        !networkState.isConnected ||
        networkState.type === NetInfoStateType.cellular ||
        (networkState.details !== null && networkState.details.isConnectionExpensive)
      ) {
        reject("not on wifi")
      }
      return AsyncStorage.getItem('@background')
    }).then((background: string | null) => {
      if (background === 'no') {
        reject("app in foreground")
      }
    })

  })
})

const BackgroundSyncOld = async (notif: Notification) => {
  // this not interact with the server.
  const exists = await RPCModule.walletExists();

  // only if exists the wallet file make sense to do the sync.
  if (exists && exists !== 'false') {
    // only if we have connection make sense to call RPCModule.
    const networkState = await NetInfo.fetch();
    if (
      !networkState.isConnected ||
      networkState.type === NetInfoStateType.cellular ||
      (networkState.details !== null && networkState.details.isConnectionExpensive)
    ) {
      //console.log(
      //  'BS: Not started (connected: ' + networkState.isConnected,
      //  +', type: ' +
      //    networkState.type +
      //    +', expensive connection: ' +
      //    networkState.details?.isConnectionExpensive +
      //    ')',
      //);
      return;
    }
    // if the App goes to Foreground kill the interval
    const background = await AsyncStorage.getItem('@background');
    if (background === 'no') {
      //console.log('BS: Not started (going to foreground)');
      return;
    }

    let batch_num = -1;
    console.log('BS:', notif);

    // finishEarly has two fields: wait, and done.
    // wait() returns a promise, which is resolved when
    // done() is called
    let finishEarly = manuallyResolve();

    let saver = setInterval(async () => {
      const networkStateSaver = await NetInfo.fetch();
      if (
        !networkStateSaver.isConnected ||
        networkStateSaver.type === NetInfoStateType.cellular ||
        (networkStateSaver.details !== null && networkStateSaver.details.isConnectionExpensive)
      ) {
        //console.log(
        //  'BS: Interrupted (connected: ' + networkStateSaver.isConnected,
        //  +', type: ' +
        //    networkStateSaver.type +
        //    +', expensive connection: ' +
        //    networkStateSaver.details?.isConnectionExpensive +
        //    ')',
        //);
        clearInterval(saver);
        finishEarly.done();
        return;
      }
      // if the App goes to Foreground kill the interval
      const backgroundSaver = await AsyncStorage.getItem('@background');
      if (backgroundSaver === 'no') {
        clearInterval(saver);
        //console.log('BS: Finished (going to foreground)');
        finishEarly.done();
        return;
      }

      const syncStatusStr: string = await RPCModule.execute('syncstatus', '');
      if (syncStatusStr) {
        if (syncStatusStr.toLowerCase().startsWith('error')) {
          //console.log(`BS: Error sync status ${syncStatusStr}`);
          return;
        }
      } else {
        //console.log('BS: Internal Error sync status');
        return;
      }

      let ss = {} as RPCSyncStatusType;
      try {
        ss = await JSON.parse(syncStatusStr);
      } catch (e) {
        //console.log('BS: Error parsing syncstatus JSON', e);
        return;
      }

      //console.log('BS:', ss);
      if (ss.batch_num && ss.batch_num > -1 && batch_num !== ss.batch_num) {
        await RPCModule.doSave();
        //console.log('BS: saving...');
        // update batch_num with the new value, otherwise never change
        batch_num = ss.batch_num;


        await notifee.displayNotification({
          // Needs to match SERVICE_NOTIFICATION_ID in BackgroundSync.kt
          // TODO: Unify constants between Kotlin and TypeScript
          id: notif.id?.toString(),
          body: 'Batch ' + batch_num + ' of ' + ss.batch_total,
          title: 'Zingo Sync',
          android: { channelId: notif.android?.channelId },
        });
      }
    }, 5000);

    await Promise.race([RPCModule.execute('sync', ''), finishEarly.wait()]);
    clearInterval(saver);
  } else {
    console.log('BS: wallet file does not exist');
  }
  //console.log('BS: Finished (end of syncing)');
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
