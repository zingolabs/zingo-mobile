const { log, device, by, element } = require('detox');

import { loadTestWallet } from "./loadTestWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Renders Sync Report data (blocks & batches) correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', loadTestWallet);
  
  it('When App go to background & back to foreground -> Report Screen: blocks & batches are aligned', async () => {
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await waitFor(element(by.id('menu.syncreport'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('menu.syncreport')).tap();

    // waiting for starting the sync process
    await waitFor(element(by.id('syncreport.currentbatch'))).toBeVisible().withTimeout(sync_timeout);

    // put the App in background
    await device.sendToHome();
    // put the App to sleep because we need some progress in BS to reproduce the bug
    await sleep(20000);
    // put the App in foregroung again
    await device.launchApp({ newInstance: false });

    // waiting for starting the sync process again
    await waitFor(element(by.id('syncreport.currentbatch'))).toBeVisible().withTimeout(sync_timeout);

    // getting current batch & total batches from the screen
    const batches = element(by.id('syncreport.currentbatch'));
    const batches_attributes = await batches.getAttributes();
    const batchNum = parseInt(batches_attributes.text.split(':')[1].split('of')[0], 10);
    const batchesNum = parseInt(batches_attributes.text.split(':')[2], 10);

    // getting blocks now synced from the screen
    const blockssyncednow = element(by.id('syncreport.syncednow'));
    const blockssyncednow_attributes = await blockssyncednow.getAttributes();
    const blockssyncednowNum = parseInt(blockssyncednow_attributes.text.split(' ')[0], 10);

    // getting blocks not yet sync from the screen
    const blocksnotyetsynced = element(by.id('syncreport.notyetsynced'));
    const blocksnotyetsynced_attributes = await blocksnotyetsynced.getAttributes();
    const blocksnotyetsyncedNum = parseInt(blocksnotyetsynced_attributes.text.split(' ')[0], 10);

    // calculating total blocks in this sync process
    const blockstotalNum = blockssyncednowNum + blocksnotyetsyncedNum;

    // getting blocks per batch or batch size from the screen
    const batchsize = element(by.id('syncreport.blocksperbatch'));
    const batchsize_attributes = await batchsize.getAttributes();
    const batchsizeNum = parseInt(batchsize_attributes.text, 10);

    log.info('batches', batchNum);
    log.info('total batches', batchesNum);
    log.info('blocks sync now', blockssyncednowNum);
    log.info('blocks not yet sync', blocksnotyetsyncedNum);
    log.info('blocks total', blockstotalNum);
    log.info('batch size:', batchsizeNum);

    // a couple of examples:
    // batch: 1  -> means blocks between 0 and 100
    // batch: 33 -> means blocks between 3200 and 3300
    if (blockssyncednowNum < (batchNum * batchsizeNum) - batchsizeNum || blockssyncednowNum > (batchNum * batchsizeNum)) {
      fail('The synced blocks are not align with the synced batches');
    }
    
    if (blockstotalNum < (batchesNum * batchsizeNum) - batchsizeNum || blockstotalNum > (batchesNum * batchsizeNum)) {
      fail('The total blocks in this process are not align with the total of batches');
    }
  });
});
