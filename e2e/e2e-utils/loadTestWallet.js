const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let loadTestWallet = async () => {
  // waiting while app is detecting the best server
  await sleep(10000);
  // the start always is like a fresh install -> create a new wallet
  // go to setting modal screen
  await waitFor(element(by.id('header.drawmenu'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('header.drawmenu')).tap();
  await waitFor(element(by.id('menu.loadwalletfromseed'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('menu.loadwalletfromseed')).tap();
  await waitFor(element(by.text('CONFIRM'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.text('CONFIRM')).tap();

  await waitFor(element(by.id('import.seedufvkinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("import.seedufvkinput")).replaceText(
    'lottery multiply patient simple ivory leisure swift square west despair beauty match crowd margin reject box always title photo remind word diet ecology badge'
  );
  await waitFor(element(by.id('import.birthdayinput'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id("import.birthdayinput")).replaceText('1994579');
  await waitFor(element(by.id('import.button.OK'))).toBeVisible().withTimeout(sync_timeout);
  await element(by.id('import.button.OK')).tap();
}

export { loadTestWallet };