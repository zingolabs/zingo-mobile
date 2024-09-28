const { log, device, by, element, fail } = require('detox');

import { loadTestWallet } from "./e2e-utils/loadTestWallet.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Renders Sync Report data (blocks & batches) correctly.', () => {
  // i just pulled this seed out of thin air
  it('loads a wallet', async () => await loadTestWallet());
  it('When App go to background & back to foreground -> Report Screen: blocks & batches are aligned', async () => {
    //await sleep(4000);

    // waiting for starting to sync and tap on play icon
    await waitFor(element(by.id('header.playicon'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.playicon')).tap();

    // waiting for starting the sync process
    await waitFor(element(by.id('syncreport.currentbatch'))).toBeVisible().withTimeout(sync_timeout);

    // put the App in background
    await device.sendToHome();
    // put the App to sleep for a while
    await sleep(5000);
    // put the App in foregroung again
    await device.launchApp({ newInstance: false });
    // we need some time to sync
    await sleep(15000);

    await element(by.id('syncreport.scroll-view')).scrollTo('bottom');

    // waiting for starting the sync process again
    await waitFor(element(by.id('syncreport.currentbatch'))).toBeVisible().withTimeout(sync_timeout);

    // getting current batch & total batches from the screen
    const batches = element(by.id('syncreport.currentbatch'));
    const batches_attributes = await batches.getAttributes();
    const batchNum = Number(batches_attributes.text.split(':')[1].split('of')[0]);
    const batchesNum = Number(batches_attributes.text.split(':')[2]);

    await waitFor(element(by.id('syncreport.syncednow'))).toBeVisible().withTimeout(sync_timeout);

    // getting blocks now synced from the screen
    const blockssyncednow = element(by.id('syncreport.syncednow'));
    const blockssyncednow_attributes = await blockssyncednow.getAttributes();
    const blockssyncednowNum = Number(blockssyncednow_attributes.text.split(' ')[0]);

    await waitFor(element(by.id('syncreport.notyetsynced'))).toBeVisible().withTimeout(sync_timeout);

    // getting blocks not yet sync from the screen
    const blocksnotyetsynced = element(by.id('syncreport.notyetsynced'));
    const blocksnotyetsynced_attributes = await blocksnotyetsynced.getAttributes();
    const blocksnotyetsyncedNum = Number(blocksnotyetsynced_attributes.text.split(' ')[0]);

    await waitFor(element(by.id('syncreport.wallettotalblocks'))).toBeVisible().withTimeout(sync_timeout);

    // calculating total blocks in this sync process
    const blockstotal = element(by.id('syncreport.wallettotalblocks'));
    const blockstotal_attributes = await blocksnotyetsynced.getAttributes();
    const blockstotalNum = Number(blocksnotyetsynced_attributes.text.split(' ')[0]);

    await waitFor(element(by.id('syncreport.blocksperbatch'))).toBeVisible().withTimeout(sync_timeout);

    // getting blocks per batch or batch size from the screen
    const batchsize = element(by.id('syncreport.blocksperbatch'));
    const batchsize_attributes = await batchsize.getAttributes();
    const batchsizeNum = Number(batchsize_attributes.text);

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
