import RPCModule from '../components/RPCModule';
import serverUris from './uris/serverUris';

const BackgroundSync = async (task_data: any) => {
  await RPCModule.initLightClient(serverUris()[0]);

  let sync_id = 0;
  console.log(task_data);
  let saver = setInterval(async () => {
    const s = await RPCModule.execute('syncstatus', '');
    if (!s) {
      return;
    }
    const ss = await JSON.parse(s);
    if (sync_id < ss.sync_id) {
      await RPCModule.doSave();
    }
  }, 2000);
  await RPCModule.execute('sync', '');
  clearInterval(saver);
};

export default BackgroundSync;
