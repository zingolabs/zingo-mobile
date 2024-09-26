const { log, device, by, element } = require('detox');
const { spawnSync, execSync } = require('child_process');

import { loadTestWallet } from "./e2e-utils/loadTestWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Kepp the screen awake while syncing.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
  it('When App is syncing -> The screen have to be awake all the time', async () => {
    //await sleep(4000);
    
    // original timeout
    const currentValue = execSync('adb -e shell settings get system screen_off_timeout');
    log.info('Current screen off timeout:', currentValue.toString().trim());
    // Set the screen off timeout to 10 seconds
    const resultSet = spawnSync('adb', ['-e', 'shell', 'settings', 'put', 'system', 'screen_off_timeout', '10000']);

    if (resultSet.status !== 0) {
      fail(`Failed to execute SET command: ${resultSet.stderr}`);
    }

    // put the App to sleep because we need some progress in the syncing for 20 seconds
    await sleep(20000);

    // make sure the timeout is set correctly to 10 seconds => 10000 ms.
    const t = execSync('adb -e shell settings get system screen_off_timeout');
    log.info('screen off timeout:', t.toString().trim());

    if (Number(t.toString().trim()) !== 10000) {
      spawnSync('adb', ['-e', 'shell', 'settings', 'put', 'system', 'screen_off_timeout', currentValue]);
      fail('setting screen off timeout is not working, it is not 10000 (10 s.)');
    }

    const resultGet = spawnSync('adb', ['-e', 'shell', 'dumpsys', 'power']);

    if (resultGet.status !== 0) {
      spawnSync('adb', ['-e', 'shell', 'settings', 'put', 'system', 'screen_off_timeout', currentValue]);
      fail(`Failed to execute DUMPSYS POWER command: ${resultGet.stderr}`);
    }
    const output = resultGet.stdout.toString();
    const isScreenAwake = output.includes('mWakefulness=Awake');

    if (!isScreenAwake) {
      spawnSync('adb', ['-e', 'shell', 'settings', 'put', 'system', 'screen_off_timeout', currentValue]);
      fail('After 20 seconds (screen off timeout 10s) the screen is not awake.');
    }
    const r = spawnSync('adb', ['-e', 'shell', 'settings', 'put', 'system', 'screen_off_timeout', currentValue]);
    log.info(r);
  });
});
