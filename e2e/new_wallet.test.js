const { log, device, by, element } = require('detox');

describe('New Wallet', () => {

  it('New wallet creation flow works.', async () => {
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
