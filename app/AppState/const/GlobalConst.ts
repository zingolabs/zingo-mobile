export const GlobalConst = {
  error: 'error',
  zcash: 'zcash:',
  port80: '80',
  port443: '443',
  port9067: '9067',
  http: 'http:',
  https: 'https:',
  serverPlaceHolder: 'https://------.---:---',
  uview: 'uview',
  uviewtest: 'uviewtest',
  uviewregtest: 'uviewregtest',
  success: 'success',
  true: 'true',
  false: 'false',
  memoMaxLength: 511,
  platformOSios: 'ios',
  platformOSandroid: 'android',
  blocksPerBatch: 100,
  yes: 'yes',
  no: 'no',
  background: '@background',
  keyKeyChain: 'ZINGO_SEED_BIRTHDAY',
  serviceKeyChain: 'ZINGO',
  replyTo: '\nReply to: \n',
  expireBlocks: 40,
  zingolib: 'Zingolib',
  zingolibError: '<error>',
  zingolibNone: '<none>',
  transactionFilterThreshold: '500',
  keyChain: 'KeyChain',
  keyStore: 'KeyStore',
  utf8: 'utf8',
  minConfirmations: 3,
  // Chain code for Zcash — the stable 'ZEC' ticker used as the default
  // `swapChain` on address-book contacts and to branch the ZEC vs non-ZEC
  // address validation/scan paths. Single source so it never drifts.
  zecSwapChain: 'ZEC',
  // Debug flag. While true, the "Meet Ironwood" onboarding launches on every
  // wallet load that finds spendable (non-dust) Orchard funds, and the
  // migration banner shows regardless of balance. False is the release
  // behavior: launch once, gated by the persisted `ironwoodOnboardSeen`
  // setting. Neither case bypasses the NU6.3 activation check — on regtest,
  // where every upgrade activates at genesis, the flag alone is enough to
  // exercise both. See `isIronwoodActive`.
  ironwoodOnboardEveryLoad: false,
};
