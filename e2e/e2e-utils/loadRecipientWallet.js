// loads the 'recipient' from zingolib mobileclient regtest scenarios
// requires e2e test to be run by cargo test runner
// see `rust/android/test/e2e_tests.rs` and `README.md`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let loadRecipientWallet = async () => {
  await sleep(2000);
  
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

  // waiting for custom server radio button
  await waitFor(element(by.id('settings.scroll-view'))).toBeVisible().withTimeout(sync_timeout);
  await waitFor(element(by.id('settings.securitytitle'))).toBeVisible()
        .whileElement(by.id('settings.scroll-view')).scroll(200, 'down');

  // choose the custom server
  await waitFor(element(by.id('settings.custom-server'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('settings.custom-server')).tap();

  // waiting for the custom server field
  await waitFor(element(by.id('settings.custom-server-field'))).toBeVisible()
        .whileElement(by.id('settings.scroll-view')).scroll(100, 'down');
  await element(by.id("settings.custom-server-field")).replaceText('http://10.0.2.2:20000');

  // waiting for the toggle, tap on regtest
  await waitFor(element(by.id('settings.custom-server-chain.regtest'))).toBeVisible()
        .whileElement(by.id('settings.scroll-view')).scroll(100, 'down');
  await element(by.id('settings.custom-server-chain.regtest')).tap();

  // save the new testnet server
  await waitFor(element(by.id('settings.button.save'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('settings.button.save')).tap();

  // waiting for seed server change screen
  await waitFor(element(by.id('seed.button.ok'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.ok')).tap();
  await waitFor(element(by.text('CONFIRM'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.text('CONFIRM')).tap();

  // restore from seed
  await waitFor(element(by.id('loadingapp.restorewalletseedufvk'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("loadingapp.restorewalletseedufvk")).tap();
  await waitFor(element(by.id('import.seedufvkinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("import.seedufvkinput")).replaceText(
    'hospital museum valve antique skate museum unfold vocal weird milk scale social vessel identify crowd hospital control album rib bulb path oven civil tank'
  );
  await waitFor(element(by.id('import.birthdayinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("import.birthdayinput")).replaceText('1994579');
  await waitFor(element(by.id('import.button.ok'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('import.button.ok')).tap();
}

export { loadRecipientWallet };