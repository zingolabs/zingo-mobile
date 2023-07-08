const { log, by, element } = require('detox');

let loadTestnet = async () => {
  // first we need to change the App to expert mode
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('menu.settings')).tap();

  await waitFor(element(by.id('settings.mode-expert'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('settings.mode-expert')).tap();
  await waitFor(element(by.id('settings.button.save'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('settings.button.save')).tap();

  // change to testnet mode
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('menu.settings')).tap();
  await element(by.id('settings.scrollView')).scroll(1000, 'down');
  // waiting for the custom server radio
  await waitFor(element(by.id('settings.customServer'))).toBeVisible().withTimeout(sync_timeout);

  // choose the custom server 
  await element(by.id('settings.customServer')).tap();

  // waiting for the custom server field
  await waitFor(element(by.id('settings.customServerField'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("settings.customServerField")).replaceText('https://testnet.lightwalletd.com');
  await element(by.id("settings.chaintype.test")).tap();

  // save the new testnet server
  await element(by.id('settings.button.save')).tap();

  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);

  // three taps to be really sure...
  await element(by.id('seed.button.OK')).tap();
  await element(by.id('seed.button.OK')).tap();
  await element(by.id('seed.button.OK')).tap();

  log.info('onto loadingapp screen')

  await waitFor(element(by.id('loadingapp.restorewalletseed'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("loadingapp.restorewalletseed")).tap();
  await waitFor(element(by.id('seed.seedinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("seed.seedinput")).replaceText(
    'cabin bounce top boost village clutch enact owner thing harsh include valve whip puppy mutual sad glimpse wide social industry original power vital orient'
    // 'loud gas chaos distance pass winner sister energy truly sponsor tornado nasty borrow infant vault owner flock tube domain metal resist either prize fringe'
  );
  await waitFor(element(by.id('seed.birthdayinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("seed.birthdayinput")).replaceText('2412856'); //this must be occasionally updated.
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.OK')).tap();
}
// export { loadTestnet };

let syncTestnet = async () => {
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
  const batchNum = Number(batches_attributes.text.split(':')[1].split('of')[0]);
  const batchesNum = Number(batches_attributes.text.split(':')[2]);

  // getting blocks now synced from the screen
  const blockssyncednow = element(by.id('syncreport.syncednow'));
  const blockssyncednow_attributes = await blockssyncednow.getAttributes();
  const blockssyncednowNum = Number(blockssyncednow_attributes.text.split(' ')[0]);

  // getting blocks not yet sync from the screen
  const blocksnotyetsynced = element(by.id('syncreport.notyetsynced'));
  const blocksnotyetsynced_attributes = await blocksnotyetsynced.getAttributes();
  const blocksnotyetsyncedNum = Number(blocksnotyetsynced_attributes.text.split(' ')[0]);

  // calculating total blocks in this sync process
  const blockstotalNum = blockssyncednowNum + blocksnotyetsyncedNum;

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
}
// export { syncTestnet };

let sendTestnet = async () => {
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
  const batchNum = Number(batches_attributes.text.split(':')[1].split('of')[0]);
  const batchesNum = Number(batches_attributes.text.split(':')[2]);

  // getting blocks now synced from the screen
  const blockssyncednow = element(by.id('syncreport.syncednow'));
  const blockssyncednow_attributes = await blockssyncednow.getAttributes();
  const blockssyncednowNum = Number(blockssyncednow_attributes.text.split(' ')[0]);

  // getting blocks not yet sync from the screen
  const blocksnotyetsynced = element(by.id('syncreport.notyetsynced'));
  const blocksnotyetsynced_attributes = await blocksnotyetsynced.getAttributes();
  const blocksnotyetsyncedNum = Number(blocksnotyetsynced_attributes.text.split(' ')[0]);

  // calculating total blocks in this sync process
  const blockstotalNum = blockssyncednowNum + blocksnotyetsyncedNum;

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

  await element(by.text('CLOSE')).tap;
}
// export { sendTestnet };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('...', () => {
  it('loads a testnet wallet', loadTestnet);
  
  it('syncs...', syncTestnet);

  it('adds return address to the memo if that option is selected, and correctly renders confirm screen', async () => {
    await element(by.text('SEND')).tap();
    
    await element(by.id('send.addressplaceholder')).replaceText(
      // 'u1lx7nlnqqqs7p4hcqz4hyjgnw7h8zskcgr2f8dfhm96np0gnfdzu7jtms7q2pxd7ufy96wxzdsdy65jvp3td7fj2ltcz0jpak86ddyszl9ykn5s86q3xataya5867z3tj2x8cw0ljyrenymr2gcqmjf50gmexqj233yn3kdaxn2yukwcx87emurufakf82wapgnu5h3fvae6aw9uus2r',
      'utest1cvzrmq2qy9sc7mk7ramrc4gr0uu4m0mdc89srrx5k94vs6em3kt5x8zdtu8k8w6v56yfn79yr0frzuyzgl8uztgrwdsfkadkce2num4lhplxp7dgayjdtzhs4mgvf95ntt6rqj472y430huvhmk4g5nrlq932vswp4xqlxr3j5j4e74667dzzyxpfdrhr8qg235dfg4y8373kqnuz4e',
    );
    await element(by.id('send.amount')).replaceText('0.01');
    // await element(by.id('send.checkboxUA')).tap();
    await element(by.id('send.scrollView')).scrollTo('bottom');
    await element(by.id('send.memo-field')).replaceText("8008");
    await element(by.id('send.scrollView')).scrollTo('bottom');
    await element(by.id('send.button')).tap();

    await element(by.id('send.confirm.scrollView')).scrollTo('bottom');
    
    const memo = element(by.id('send.confirm-memo'));

    await expect(memo).toBeVisible(100);
    await expect(memo).toHaveText(
      '1\n2\n3\n4\n5\n6\n7\n8\nReply to: \nutest1kcth7yst8s7u4yqf9hnrrfmrte40sy49z83qctvmxc528xf37swhkw53yhhzmceq07a83waevggwh3uyxffjgx30wcua2s0rgpt3seeae4nlrdedj9kxdgcx9uyug3d0ae5rk4q22r8pl37h75pnfaqvrp3qqxvnvvfldvs0frhllv7av8lhcesaskmsx7gfw5dd8shhm9aju98aelv',
    );
  });
});
