// loads the 'recipient' from zingolib mobileclient regtest scenarios
let loadRecipientWallet = async () => {
  // the start always is like a fress install -> create a new wallet
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

  // change to another wallet
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.changewallet'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('menu.changewallet')).tap();
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.OK')).tap();
  await waitFor(element(by.text('CONFIRM'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.text('CONFIRM')).tap();

  // connect to regtest network
  await waitFor(element(by.id('options.menu'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('options.menu')).tap();

  // restore from seed
  await waitFor(element(by.id('loadingapp.restorewalletseed'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("loadingapp.restorewalletseed")).tap();
  await waitFor(element(by.id('seed.seedinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("seed.seedinput")).replaceText(
    'hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank'
  );
  await waitFor(element(by.id('seed.birthdayinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("seed.birthdayinput")).replaceText('3');
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.OK')).tap();
}

export { loadRecipientWallet };