import { ChainNameEnum } from '@app/AppState';
import { viewingKeyChain } from '@app/utils/seedPhrase';

test.each([
  ['uview1qqqq', ChainNameEnum.mainChainName],
  ['uviewtest1qqqq', ChainNameEnum.testChainName],
  ['uviewregtest1qqqq', ChainNameEnum.regtestChainName],
  [' UVIEWTEST1QQQQ ', ChainNameEnum.testChainName],
  ['abandon ability able', null],
])('Tests that the viewing key %p names the %p network', (key, chain) => {
  expect(viewingKeyChain(key)).toBe(chain);
});
