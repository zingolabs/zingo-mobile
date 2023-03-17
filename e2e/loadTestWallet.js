
let loadTestWallet = async () => {
  await element(by.id("loadingapp.restorewalletseed")).tap();
  await element(by.id("seed.seedplaceholder")).replaceText(
    'lottery multiply patient simple ivory leisure swift square west despair beauty match crowd margin reject box always title photo remind word diet ecology badge'
  );
  await element(by.id("birthdayinput")).replaceText('1994579');
  await element(by.text("RESTORE WALLET")).tap();
}

export { loadTestWallet };