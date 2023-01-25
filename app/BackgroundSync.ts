
import RPC from './rpc';
import RPCModule from '../components/RPCModule';

const BackgroundSync = async () => {
  console.error("I'm running in a background task");
  let sync_id = 0;
  let saver = setInterval(async () => {
        const s = await RPC.doSyncStatus();
        if (!s) {
          return;
        }
        const ss = await JSON.parse(s);
    if (sync_id < ss.sync_id) {
      await RPCModule.doSave()
    }
  }, 2000)
  await RPC.doSync()
  clearInterval(saver)
};

export default {BackgroundSync}
