const { log, device, by, element } = require('detox');

const sleep = ms => new Promise(r => setTimeout(r, ms));

describe('New Wallet', () => {
  it('New wallet creation flow works.', async () => {
    //await sleep(5000);

    // change to another wallet -> new wallet
    await waitFor(element(by.id('header.drawmenu')))
      .toBeVisible()
      .withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await waitFor(element(by.id('menu.changewallet')))
      .toBeVisible()
      .withTimeout(sync_timeout);
    await element(by.id('menu.changewallet')).tap();
    await waitFor(element(by.id('seed.button.ok')))
      .toBeVisible()
      .withTimeout(sync_timeout);
    await element(by.id('seed.button.ok')).tap();
    await waitFor(element(by.text('CONFIRM')))
      .toBeVisible()
      .withTimeout(sync_timeout);
    await element(by.text('CONFIRM')).tap();

    await waitFor(element(by.id('loadingapp.createnewwallet')))
      .toBeVisible()
      .withTimeout(sync_timeout);
    await element(by.id('loadingapp.createnewwallet')).tap();
    await waitFor(element(by.id('seed.button.ok')))
      .toBeVisible()
      .withTimeout(sync_timeout);
    await element(by.id('seed.button.ok')).tap();

    await waitFor(element(by.id('valuetransfer text')))
      .toBeVisible()
      .withTimeout(sync_timeout);
    let text = element(by.id('valuetransfer text'));
    let attributes = await text.getAttributes();
    log.info(attributes);
    log.info('Value:', attributes.value);
    log.info('Text:', attributes.text);
    log.info('Visibility:', attributes.visibility);
    log.info('Width (pixels):', attributes.width);

    await expect(text).toBeVisible();
    await expect(text).toHaveText('History');

    // waiting new wallet fully synced
    await waitFor(element(by.id('header.checkicon')))
      .toBeVisible()
      .withTimeout(sync_timeout);
  });
});
