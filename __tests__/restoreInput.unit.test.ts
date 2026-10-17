import { ChainNameEnum, RestoreFromTypeEnum } from '@app/AppState';
import { restoreInput } from '@app/LoadingApp/restoreInput';

const main = ChainNameEnum.mainChainName;
const test_ = ChainNameEnum.testChainName;

test('Tests that a seed phrase with a birthday past activation restores from seed with the birthday as text', () => {
  expect(restoreInput('Abandon Abandon', 2_000_000, main)).toEqual({
    kind: 'ok',
    key: 'abandon abandon',
    birthday: '2000000',
    from: RestoreFromTypeEnum.seedRestoreFrom,
  });
});

test('Tests that an empty key is rejected before anything else is read', () => {
  expect(restoreInput('', 2_000_000, main)).toEqual({
    kind: 'rejected',
    labelKey: 'loadingapp.emptyseedufvk-label',
    errorKey: 'loadingapp.emptyseedufvk-error',
  });
});

test('Tests that a testnet UFVK is rejected when the server is on mainnet', () => {
  expect(restoreInput('uviewtest1abc', 2_000_000, main)).toEqual({
    kind: 'rejected',
    labelKey: 'loadingapp.invalidseedufvk-label',
    errorKey: 'loadingapp.invalidseedufvk-error',
  });
});

test('Tests that a mainnet UFVK is rejected when the server is on testnet', () => {
  expect(restoreInput('uview1abc', 2_000_000, test_).kind).toBe('rejected');
});

test('Tests that an uppercase UFVK is lowercased once and checked against the chain', () => {
  expect(restoreInput('UVIEWTEST1ABC', 2_000_000, main).kind).toBe('rejected');
  expect(restoreInput('UVIEWTEST1ABC', 2_000_000, test_)).toEqual({
    kind: 'ok',
    key: 'uviewtest1abc',
    birthday: '2000000',
    from: RestoreFromTypeEnum.ufvkRestoreFrom,
  });
});

test('Tests that a birthday under the activation height is rejected', () => {
  expect(restoreInput('abandon', 419_199, main)).toEqual({
    kind: 'rejected',
    labelKey: 'loadingapp.invalidbirthday-label',
    errorKey: 'loadingapp.invalidbirthday-error',
  });
});

test('Tests that a negative or NaN birthday reads as zero and is rejected on a chain with activation above it', () => {
  expect(restoreInput('abandon', -5, main).kind).toBe('rejected');
  expect(restoreInput('abandon', Number.NaN, main).kind).toBe('rejected');
});

test('Tests that a birthday at the activation height restores', () => {
  expect(restoreInput('abandon', 1, ChainNameEnum.regtestChainName)).toEqual({
    kind: 'ok',
    key: 'abandon',
    birthday: '1',
    from: RestoreFromTypeEnum.seedRestoreFrom,
  });
});
