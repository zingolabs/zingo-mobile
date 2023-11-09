// loads the 'recipient' from zingolib mobileclient regtest scenarios
// requires e2e test to be run by cargo test runner
// see `rust/android/test/e2e_tests.rs`
let loadRecipientWallet = async () => {
  // switch to advanced mode
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('menu.settings')).tap();
  await waitFor(element(by.id('settings.mode-advanced'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('settings.mode-advanced')).tap();
  await waitFor(element(by.id('settings.button.save'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('settings.button.save')).tap();

  // connect to regtest network
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('menu.settings')).tap();
  await element(by.id('settings.scrollView')).scroll(700, 'down');
  await waitFor(element(by.id('settings.customServer'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('settings.customServer')).tap();
  await waitFor(element(by.id('settings.customServerChain.regtest'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("settings.customServerChain.regtest")).tap();
  await waitFor(element(by.id('settings.customServerField'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("settings.customServerField")).replaceText('http://10.0.2.2:20000');
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
  await element(by.id("seed.birthdayinput")).replaceText('3');
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.OK')).tap();

  await waitFor(element(by.id('loadingapp.restorewalletseed'))).toBeVisible().withTimeout(sync_timeout);
}

export { loadRecipientWallet };