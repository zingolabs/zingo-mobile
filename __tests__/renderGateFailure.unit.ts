jest.mock('../app/RPCModule', () => ({ __esModule: true, default: {} }));

import Utils from '../app/utils';
import type { TranslateType } from '../app/AppState';

const translate = (k: string): TranslateType => k;

test('renderGateFailure keeps raw diagnostics out of user copy', () => {
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
  expect(
    Utils.renderGateFailure(
      { kind: 'error', errorKey: 'biometrics-failure-notserved', param: '11' },
      translate,
    ),
  ).toBe('biometrics-failure-notserved');
});
