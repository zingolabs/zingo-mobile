const sleep = ms => new Promise(r => setTimeout(r, ms));

let loadTestWallet = async () => {
  // waiting while app is detecting the best server
  await sleep(2000);

  // the start always is like a fresh install -> the app lands on the
  // start menu, where the restore action lives
  await waitFor(element(by.id('loadingapp.restorewalletseedufvk')))
    .toBeVisible()
    .withTimeout(sync_timeout);
  await element(by.id('loadingapp.restorewalletseedufvk')).tap();

  await waitFor(element(by.id('import.seedufvkinput')))
    .toBeVisible()
    .withTimeout(sync_timeout);
  await element(by.id('import.seedufvkinput')).replaceText(
    'lottery multiply patient simple ivory leisure swift square west despair beauty match crowd margin reject box always title photo remind word diet ecology badge',
  );
  await waitFor(element(by.id('import.birthdayinput')))
    .toBeVisible()
    .withTimeout(sync_timeout);
  await element(by.id('import.birthdayinput')).replaceText('1994579');
  await waitFor(element(by.id('import.button.ok')))
    .toBeVisible()
    .withTimeout(sync_timeout);
  await element(by.id('import.button.ok')).tap();
};

export { loadTestWallet };
