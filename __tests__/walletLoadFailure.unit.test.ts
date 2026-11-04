import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import { causeOf, restoreKeyUsable } from '@app/LoadingApp/walletLoadFailure';

const SEED =
  'abandon abandon abandon abandon abandon abandon abandon abandon ' +
  'abandon abandon abandon abandon abandon abandon abandon abandon ' +
  'abandon abandon abandon abandon abandon abandon abandon art';

describe('causeOf', () => {
  test('Tests that the cause follows the type when the type names one', () => {
    expect(causeOf('InitServer')).toBe('server');
    expect(causeOf('InitKey')).toBe('key');
    expect(causeOf('InitWalletFile')).toBe('file');
  });

  test('Tests that the cause is unknown when the type names none', () => {
    expect(causeOf('Init')).toBe('unknown');
    expect(causeOf('Unknown')).toBe('unknown');
    expect(causeOf('WalletChainMismatch')).toBe('unknown');
  });
});

describe('restoreKeyUsable', () => {
  const MAIN = ChainNameEnum.mainChainName;

  test('Tests that a seed passes when its words carry the checksum', () => {
    expect(restoreKeyUsable(SEED, MAIN)).toBe(true);
    expect(restoreKeyUsable(`  ${SEED.toUpperCase()}\n`, MAIN)).toBe(true);
  });

  test('Tests that a seed is refused when a word or the checksum is wrong', () => {
    expect(restoreKeyUsable(SEED.replace(/art$/, 'zoo'), MAIN)).toBe(false);
    expect(restoreKeyUsable(SEED.replace(/art$/, 'notaword'), MAIN)).toBe(
      false,
    );
    expect(restoreKeyUsable('abandon abandon', MAIN)).toBe(false);
  });

  test('Tests that a viewing key passes when it matches the server network', () => {
    expect(restoreKeyUsable('uview1qqqq', MAIN)).toBe(true);
    expect(
      restoreKeyUsable('uviewtest1qqqq', ChainNameEnum.testChainName),
    ).toBe(true);
    expect(
      restoreKeyUsable('uviewtest1qqqq', ChainNameEnum.noneChainName),
    ).toBe(true);
  });

  test('Tests that a viewing key is refused when its network or a character is wrong', () => {
    expect(restoreKeyUsable('uviewtest1qqqq', MAIN)).toBe(false);
    expect(restoreKeyUsable('uview1qqbq', MAIN)).toBe(false);
  });
});
