const { log, device, by, element } = require('detox');

import { loadTestWallet } from "./loadTestWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Renders Sync Report data (blocks & batches) correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
  
  it('When App go to background & back to foreground -> Report Screen: blocks & batches are aligned', async () => {
    await element(by.id('header.drawmenu')).tap();
    await element(by.id('menu.syncreport')).tap();

    // 10 seconds of timeout.
    await waitFor(element(by.id('syncreport.currentbatch'))).toBeVisible().withTimeout(10000);

    await device.sendToHome();
    await sleep(20000);
    await device.launchApp({ newInstance: false });

    // 10 seconds of timeout.
    await waitFor(element(by.id('syncreport.currentbatch'))).toBeVisible().withTimeout(10000);

    const batches = element(by.id('syncreport.currentbatch'));
    const batches_attributes = await batches.getAttributes();
    const batchNum = Number(batches_attributes.text.split(':')[1].split('of')[0]);
    const batchesNum = Number(batches_attributes.text.split(':')[2]);

    const blockssyncednow = element(by.id('syncreport.syncednow'));
    const blockssyncednow_attributes = await blockssyncednow.getAttributes();
    const blockssyncednowNum = Number(blockssyncednow_attributes.text.split(' ')[0]);

    const blocksnotyetsynced = element(by.id('syncreport.notyetsynced'));
    const blocksnotyetsynced_attributes = await blocksnotyetsynced.getAttributes();
    const blocksnotyetsyncedNum = Number(blocksnotyetsynced_attributes.text.split(' ')[0]);

    const blockstotalNum = blockssyncednowNum + blocksnotyetsyncedNum;

    log.info('batches', batchNum);
    log.info('total batches', batchesNum);
    log.info('blocks sync now', blockssyncednowNum);
    log.info('blocks not yet sync', blocksnotyetsyncedNum);
    log.info('blocks total', blockstotalNum);

    // a couple of examples:
    // batch: 1  -> means blocks between 0 and 100
    // batch: 33 -> means blocks between 3200 and 3300
    if (blockssyncednowNum < (batchNum * 100) - 100 || blockssyncednowNum > (batchNum * 100)) {
      fail('The synced blocks are not align with the synced batches');
    }
    
    if (blockstotalNum < (batchesNum * 100) - 100 || blockstotalNum > (batchesNum * 100)) {
      fail('The total blocks in this process are not align with the total of batches');
    }
  });
});
