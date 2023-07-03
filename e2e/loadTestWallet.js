
let loadTestWallet = async () => {
  // the start always is like a fress install -> create a new wallet
  // go to setting modal screen
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.settings'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('menu.settings')).tap();

  // first we need to change the App to expert mode
  await waitFor(element(by.id('settings.mode-expert'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('settings.mode-expert')).tap();
  await waitFor(element(by.id('settings.button.save'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('settings.button.save')).tap();

  // change to another wallet -> restore from seed
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.changewallet'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('menu.changewallet')).tap();

  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);

  // three taps to be really sure...
  await element(by.id('seed.button.OK')).tap();
  await element(by.id('seed.button.OK')).tap();
  await element(by.id('seed.button.OK')).tap();

  await waitFor(element(by.id('loadingapp.restorewalletseed'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("loadingapp.restorewalletseed")).tap();
  await waitFor(element(by.id('seed.seedinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("seed.seedinput")).replaceText(
    'lottery multiply patient simple ivory leisure swift square west despair beauty match crowd margin reject box always title photo remind word diet ecology badge'
  );
  await waitFor(element(by.id('seed.birthdayinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("seed.birthdayinput")).replaceText('1994579');
  await waitFor(element(by.id('seed.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('seed.button.OK')).tap();
}

export { loadTestWallet };