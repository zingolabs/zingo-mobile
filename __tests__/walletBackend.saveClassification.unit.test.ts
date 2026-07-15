/**
 * The TypeScript half of the save-path classification contract
 * (zingo-mobile#1151; audit Issue Q): whether a native save succeeded is
 * knowable from the shape of its result, never from sniffing its content —
 * and error prose must never be mistaken for success.
 *
 * These tests are the TS twins of the Rust wallet_export_tests and the
 * Kotlin WalletExportClassificationTest.
 */
jest.mock('../app/RPCModule', () => ({
  __esModule: true,
  default: {
    doSave: jest.fn(),
  },
}));

import RPCModule from '../app/RPCModule';
import {
  doSave,
  nativeSaveSucceeded,
} from '../app/walletBackend/utils/walletUtils';

const mockedDoSave = RPCModule.doSave as jest.Mock;

describe('nativeSaveSucceeded', () => {
  it('accepts the Android success shape (boolean true)', () => {
    expect(nativeSaveSucceeded(true)).toBe(true);
  });

  it('accepts the iOS success shape (the string "true")', () => {
    expect(nativeSaveSucceeded('true')).toBe(true);
  });

  it('rejects the Android failure shape (boolean false)', () => {
    expect(nativeSaveSucceeded(false)).toBe(false);
  });

  it('rejects the iOS failure shape (the string "false")', () => {
    expect(nativeSaveSucceeded('false')).toBe(false);
  });

  it('never mistakes error prose for success', () => {
    // The attack case: both bridges' catch blocks resolve prose instead of
    // rejecting. A truthiness check classifies that prose as a successful
    // backup, and changeWallet then deletes the wallet without one.
    expect(
      nativeSaveSucceeded('Error: [Native] saving wallet backup: disk full'),
    ).toBe(false);
  });
});

describe('doSave', () => {
  it('passes the native resolution through without inspecting it', async () => {
    mockedDoSave.mockResolvedValueOnce(true);

    await expect(doSave()).resolves.toBe(true);
  });

  it('contains a native rejection instead of throwing', async () => {
    mockedDoSave.mockRejectedValueOnce(new Error('bridge exploded'));

    const result = await doSave();
    expect(nativeSaveSucceeded(result)).toBe(false);
  });
});
