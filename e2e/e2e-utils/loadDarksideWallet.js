// loads the 'darkside faucet' wallet for the darkside module in zingo-mobile e2e tests
// requires e2e test to be run by cargo test runner
// see `rust/android/test/e2e_tests.rs` and `README.md`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let loadDarksideWallet = async () => {
  await sleep(10000);
  
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
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.OK')).tap();
  await waitFor(element(by.text('CONFIRM'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.text('CONFIRM')).tap();

  // restore from seed
  await waitFor(element(by.id('loadingapp.restorewalletseed'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("loadingapp.restorewalletseed")).tap();
  await waitFor(element(by.id('seed.seedinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("seed.seedinput")).replaceText(
    'still champion voice habit trend flight survey between bitter process artefact blind carbon truly provide dizzy crush flush breeze blouse charge solid fish spread'
  );
  await waitFor(element(by.id('seed.birthdayinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("seed.birthdayinput")).replaceText('0');
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.OK')).tap();
}

export { loadDarksideWallet };