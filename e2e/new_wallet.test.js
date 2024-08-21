const { log, device, by, element } = require('detox');

describe('New Wallet', () => {
  it('New wallet creation flow works.', async () => {
    // go to setting modal screen
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('menu.settings')).tap();

    // first we need to change the App to advanced mode
    await waitFor(element(by.id('settings.mode-advanced'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('settings.mode-advanced')).tap();
    await waitFor(element(by.id('settings.button.save'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('settings.button.save')).tap();

    // change to another wallet -> new wallet
    await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('header.drawmenu')).tap();
    await waitFor(element(by.id('menu.changewallet'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('menu.changewallet')).tap();
    await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.id('seed.button.OK')).tap();
    await waitFor(element(by.text('CONFIRM'))).toBeVisible().withTimeout(sync_timeout);
    await element(by.text('CONFIRM')).tap();

    let newWalletButton = element(by.text('CREATE NEW WALLET (NEW SEED)'));
    await newWalletButton.tap();
    await element(by.text('I HAVE SAVED \n THE SEED')).tap();
    // For some reason, the element that says 'ZEC', according to react,
    // has text of ' ---'
    // let zecText = element(by.text(" ---")).atIndex(1);
    let text = element(by.id('ValueTransfer text'));
    let attributes = await text.getAttributes();
    log.info(attributes);
    log.info('Value:', attributes.value);
    log.info('Text:', attributes.text);
    log.info('Visibility:', attributes.visibility);
    log.info('Width (pixels):', attributes.width);

    await expect(text).toBeVisible();
    await expect(text).toHaveText('History');

    //expect(element(by.traits(['button'])).filter())
  });
});
