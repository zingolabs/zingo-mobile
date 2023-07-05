const { log, by, element } = require('detox');

let loadTestnetWallet = async () => {
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
  await element(by.id('menu.settings')).tap();
  await element(by.id('settings.scrollView')).scroll(1000, 'down');
  // waiting for the custom server radio
  await waitFor(element(by.id('settings.customServer'))).toBeVisible().withTimeout(sync_timeout);

  // choose the custom server 
  await element(by.id('settings.customServer')).tap();

  // waiting for the custom server field
  await waitFor(element(by.id('settings.customServerField'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("settings.customServerField")).replaceText('https://testnet.lightwalletd.com');
  await element(by.id("settings.customServerField")).replaceText('https://testnet.lightwalletd.com');

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
  );
  await waitFor(element(by.id('seed.birthdayinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("seed.birthdayinput")).replaceText('2412856');
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.OK')).tap();
}

export { loadTestnetWallet };