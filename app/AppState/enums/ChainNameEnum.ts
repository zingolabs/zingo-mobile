export enum ChainNameEnum {
  mainChainName = 'main',
  testChainName = 'test',
  regtestChainName = 'regtest',
  // An unknown chain: a wallet whose chain could not be read, or an offline
  // server saved before offline carried one.
  noneChainName = '',
}
