/**
 * The TypeScript half of the save-path classification contract
 * (zingo-mobile#1151; audit Issue Q): whether a native save succeeded is
 * knowable from the shape of its result, never from sniffing its content —
 * and error prose must never be mistaken for success.
 *
 * These tests are the TS twins of the Rust wallet_export_tests and the
 * Kotlin WalletExportClassificationTest.
 */
// Every member of the mocked bridge is a lazily created jest.fn, so a future
// import-time touch of some other RPCModule member cannot break this suite.
jest.mock('../app/RPCModule', () => {
  const members: Record<PropertyKey, jest.Mock> = {};
  return {
    __esModule: true,
    default: new Proxy(members, {
      get: (target, prop) => (target[prop] ??= jest.fn()),
    }),
  };
});

import RPCModule from '../app/RPCModule';
import {
  doSave,
  doSaveBackup,
  nativeSaveSucceeded,
} from '../app/walletBackend/utils/walletUtils';

const mockedDoSave = RPCModule.doSave as jest.Mock;
const mockedDoSaveBackup = RPCModule.doSaveBackup as jest.Mock;

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

/**
 * The wrappers classify the trimodal native resolution at the single seam
 * and answer with a boolean; failure — the failure shapes, error prose, or
 * a rejected bridge promise — is always false, never re-encoded as prose
 * and never an escaping exception.
 */
describe.each([
  ['doSave', doSave, () => mockedDoSave],
  ['doSaveBackup', doSaveBackup, () => mockedDoSaveBackup],
])('%s', (_name, wrapper, mocked) => {
  it('reports the Android success shape (boolean true) as true', async () => {
    mocked().mockResolvedValueOnce(true);

    await expect(wrapper()).resolves.toBe(true);
  });

  it('reports the iOS success shape (the string "true") as true', async () => {
    mocked().mockResolvedValueOnce('true');

    await expect(wrapper()).resolves.toBe(true);
  });

  it('reports the failure shapes as false', async () => {
    mocked().mockResolvedValueOnce(false);
    await expect(wrapper()).resolves.toBe(false);

    mocked().mockResolvedValueOnce('false');
    await expect(wrapper()).resolves.toBe(false);
  });

  it('never mistakes resolved error prose for success', async () => {
    // The attack case: both bridges' catch blocks still resolve prose
    // instead of rejecting. That prose must classify as failure.
    mocked().mockResolvedValueOnce('Error: [Native] saving wallet: disk full');

    await expect(wrapper()).resolves.toBe(false);
  });

  it('contains a native rejection as false instead of throwing', async () => {
    mocked().mockRejectedValueOnce(new Error('bridge exploded'));

    await expect(wrapper()).resolves.toBe(false);
  });
});
