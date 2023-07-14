const { log, device, by, element } = require('detox');

describe('New Wallet', () => {
  it('New wallet Basic Mode creation flow works.', async () => {
    let text = element(by.id('receive text'));
    let attributes = await text.getAttributes();
    log.info(attributes);
    log.info('Value:', attributes.value);
    log.info('Text:', attributes.text);
    log.info('Visibility:', attributes.visibility);
    log.info('Width (pixels):', attributes.width);

    await expect(text).toBeVisible();
    await expect(text).toHaveText('Receive');
  });
});
