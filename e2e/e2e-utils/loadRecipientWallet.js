// loads the 'recipient' from zingolib mobileclient regtest scenarios
// requires e2e test to be run by cargo test runner
// see `rust/android/test/e2e_tests.rs` and `README.md`
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

  // connect to regtest network
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('menu.settings')).tap();
  await waitFor(element(by.id('settings.securitytitle'))).toBeVisible()
        .whileElement(by.id('settings.scroll-view')).scroll(200, 'down');
  await element(by.id('settings.custom-server')).tap();
  await element(by.id("settings.custom-server-chain.regtest")).tap();
  await element(by.id("settings.custom-server-field")).replaceText('http://10.0.2.2:20000');
  await element(by.id('settings.button.save')).tap();
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.OK')).tap();
  await waitFor(element(by.text('CONFIRM'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.text('CONFIRM')).tap();

  // restore from seed
  await waitFor(element(by.id('loadingapp.restorewalletseed'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("loadingapp.restorewalletseed")).tap();
  await waitFor(element(by.id('seed.seedinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("seed.seedinput")).replaceText(
    'hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank'
  );
  await waitFor(element(by.id('seed.birthdayinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("seed.birthdayinput")).replaceText('1994579');
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.OK')).tap();
}

export { loadRecipientWallet };