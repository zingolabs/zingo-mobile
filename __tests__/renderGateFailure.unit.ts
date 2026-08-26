jest.mock('../app/RPCModule', () => ({ __esModule: true, default: {} }));

import Utils from '../app/utils';
import type { TranslateType } from '../app/AppState';

const translate = (k: string): TranslateType => k;

test('renderGateFailure keeps raw diagnostics out of non-stalled copy', () => {
  expect(
    Utils.renderGateFailure(
      {
        kind: 'error',
        errorKey: 'biometrics-failure-declined',
        param: 'E_CRYPTO_FAILED code: 13, msg: Cancel button pressed',
      },
      translate,
    ),
  ).toBe('biometrics-failure-declined');
});

test('renderGateFailure appends the diagnostic for the stalled key', () => {
  expect(
    Utils.renderGateFailure(
      {
        kind: 'error',
        errorKey: 'biometrics-failure-stalled',
        param: 'getGenericPassword',
      },
      translate,
    ),
  ).toBe('biometrics-failure-stalled "getGenericPassword"');
});
