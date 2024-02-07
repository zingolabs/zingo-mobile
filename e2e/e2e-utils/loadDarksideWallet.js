// loads the 'darkside faucet' wallet for the darkside module in zingo-mobile e2e tests
// requires e2e test to be run by cargo test runner
// see `rust/android/test/e2e_tests.rs` and `README.md`
let loadDarksideWallet = async () => {
  // switch to advanced mode
  await element(by.id('header.drawmenu')).tap();
  await element(by.id('menu.settings')).tap();
  await element(by.id('settings.mode-advanced')).tap();
  await element(by.id('settings.button.save')).tap();

  // connect to regtest network
  await element(by.id('header.drawmenu')).tap();
  await element(by.id('menu.settings')).tap();
  await waitFor(element(by.text('MEMO DOWNLOAD'))).toBeVisible().whileElement(by.id('settings.scroll-view')).scroll(200, 'down');
  await element(by.id('settings.custom-server')).tap();
  await element(by.id("settings.custom-server-chain.regtest")).tap();
  await element(by.id("settings.custom-server-field")).replaceText('http://10.0.2.2:20000');
  await element(by.id('settings.button.save')).tap();
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.OK')).tap();
  await element(by.text('CONFIRM')).tap();

  // restore from seed
  await element(by.id("loadingapp.restorewalletseed")).tap();
  await element(by.id("seed.seedinput")).replaceText(
    'still champion voice habit trend flight survey between bitter process artefact blind carbon truly provide dizzy crush flush breeze blouse charge solid fish spread'
  );
  await element(by.id("seed.birthdayinput")).replaceText('0');
  await element(by.id('seed.button.OK')).tap();
}

export { loadDarksideWallet };