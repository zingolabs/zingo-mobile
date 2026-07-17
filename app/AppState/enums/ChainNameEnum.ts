export enum ChainNameEnum {
  mainChainName = 'main',
  testChainName = 'test',
  regtestChainName = 'regtest',
  // Offline has no server and therefore no chain. This empty sentinel lets the
  // server keep a valid `chainName` type while carrying "no chain" — the real
  // chain is derived from the wallet itself when opening offline.
  noneChainName = '',
}
