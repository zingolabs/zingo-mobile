 const { log } = require('detox');

describe('Example', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should have a visible button', async () => {
    // log.error(device.appLaunchArgs.get())
    await expect(element(by.traits(['button'])).atIndex(1)).toBeVisible();
  });

  it("New wallet button works", async () => {
    let newWalletButton = element(by.text("CREATE NEW WALLET (NEW SEED)"));
    await newWalletButton.tap();
    await element(by.text("I HAVE SAVED \n THE SEED")).tap();
    // For some reason, the element that says 'ZEC', according to react, 
    // has text of ' ---'
    // let zecText = element(by.text(" ---")).atIndex(1);
    let text = element(by.id('transaction text'))
    let attributes = await text.getAttributes();
    log.info(attributes);
    log.info("Value:", attributes.value);
    log.info("Text:", attributes.text);
    log.info("Visibility:", attributes.visibility);
    log.info("Width (pixels):", attributes.width);
    log.info("AAAaaaaaaaahhhh")

    await expect(text).toBeVisible();
    await expect(text).toHaveText("Wallet");
    
    //expect(element(by.traits(['button'])).filter())
  });
  
  // my failing test
  // it('should actually be invisible button', async () => {
  //   // log.error(device.appLaunchArgs.get())
  //   await expect(element(by.traits(['button'])).atIndex(1)).not.toBeVisible();
  // });
  
  // example tests
  //   it('should have welcome screen', async () => {
  //     await expect(element(by.id('welcome'))).toBeVisible();
  //   });

  //   it('should show hello screen after tap', async () => {
  //     await element(by.id('hello_button')).tap();
  //     await expect(element(by.text('Hello!!!'))).toBeVisible();
  //   });

  //   it('should show world screen after tap', async () => {
  //     await element(by.id('world_button')).tap();
  //     await expect(element(by.text('World!!!'))).toBeVisible();
  //   });

});
