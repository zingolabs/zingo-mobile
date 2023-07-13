const { log, by, element } = require('detox');

async function joinTestnet() {
  // first we need to change the App to expert mode
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('menu.settings')).tap();

  await waitFor(element(by.id('settings.mode-expert'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('settings.mode-expert')).tap();
  await waitFor(element(by.id('settings.button.save'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('settings.button.save')).tap();

  // change to testnet mode
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('menu.settings')).tap();
  await element(by.id('settings.scrollView')).scroll(1000, 'down');
  // waiting for the custom server radio
  // choose the custom server 
  await waitFor(element(by.id('settings.customServer'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('settings.customServer')).tap();

  // waiting for the custom server field
  await waitFor(element(by.id('settings.customServerField'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id("settings.customServerField")).replaceText('https://testnet.lightwalletd.com');
  await waitFor(element(by.id('chaintype.testnet'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id("chaintype.testnet")).tap();

  // save the new testnet server
  await waitFor(element(by.id('settings.button.save'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('settings.button.save')).tap();

  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(ui_timeout);
  // three taps to be really sure...
  await element(by.id('seed.button.OK')).tap();
  await element(by.id('seed.button.OK')).tap();
  await element(by.id('seed.button.OK')).tap();

  log.info('onto loadingapp screen')
}

async function load(seed,birthday) {
  await waitFor(element(by.id('loadingapp.restorewalletseed'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id("loadingapp.restorewalletseed")).tap();
  await waitFor(element(by.id('seed.seedinput'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id("seed.seedinput")).replaceText(seed);
  await waitFor(element(by.id('seed.birthdayinput'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id("seed.birthdayinput")).replaceText(birthday);
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('seed.button.OK')).tap();
}

async function sync(background_duration) {
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.syncreport'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('menu.syncreport')).tap();

  // waiting for starting the sync process
  await waitFor(element(by.id('syncreport.currentbatch'))).toBeVisible().withTimeout(ui_timeout);

  // put the App in background
  await device.sendToHome();
  // put the App to sleep because we need some progress in background sync
  await sleep(background_duration);
  // put the App in foregroung again
  await device.launchApp({ newInstance: false });

  await waitFor(element(by.text("Finished"))).toBeVisible().withTimeout(sync_timeout)

  // waiting for starting the sync process again
  // await waitFor(element(by.id('syncreport.currentbatch'))).toBeVisible().withTimeout(ui_timeout);

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
    fail('The synced blocks do not align with the synced batches');
  }
  
  if (blockstotalNum < (batchesNum * batchsizeNum) - batchsizeNum || blockstotalNum > (batchesNum * batchsizeNum)) {
    fail('The total blocks in this process do not align with the total of batches');
  }
}

async function send(address) {
  // since we ended up in the sync report screen
  await waitFor(element(by.text('CLOSE'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.text('CLOSE')).tap();
  
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('menu.settings')).tap();
  await waitFor(element(by.id('settings.sendalls-enable'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('settings.sendalls-enable')).tap();
  await waitFor(element(by.id('settings.button.save'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('settings.button.save')).tap();

  await waitFor(element(by.text('SEND'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.text('SEND')).tap();

  await waitFor(element(by.id('send.addressplaceholder'))).toBeVisible().withTimeout(ui_timeout);
  await element(by.id('send.addressplaceholder')).replaceText(address);

  // how do we send all?
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('...', () => {
  // 'cabin bounce top boost village clutch enact owner thing harsh include valve whip puppy mutual sad glimpse wide social industry original power vital orient'
  //'2412856');
  //this MUST BE occasionally updated.
  it('joins testnet ', (() => joinTestnet()));
  it('loads a wallet (testnet)', (() => load('cabin bounce top boost village clutch enact owner thing harsh include valve whip puppy mutual sad glimpse wide social industry original power vital orient',"2412856")));
  
  it('syncs...', (() => sync(10000)));
  
  it('sends...', (() => send('lala')));
});
