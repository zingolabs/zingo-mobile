import { Alert } from 'react-native';
import RPCModule from '../components/RPCModule';

const BackgroundSync = async (task_data: Object) => {
    Alert.alert('Alert Title', 'My Alert Msg', [
      {
        text: 'Cancel',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      {text: 'OK', onPress: () => console.log('OK Pressed')},
    ]);
  
  let sync_id = 0;
  console.log(task_data)
  let saver = setInterval(async () => {
        const s = await RPCModule.execute("syncstatus", "")
        if (!s) {
          return;
        }
        const ss = await JSON.parse(s);
    if (sync_id < ss.sync_id) {
      await RPCModule.doSave()
    }
  }, 2000)
  await RPCModule.execute('sync', '')
  clearInterval(saver)
};

export default BackgroundSync
