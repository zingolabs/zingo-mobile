/**
 * @format
 */

import { interpretWalletFetchResult } from '../app/walletBackend/utils/walletFetchOutcome';
import { FfiResult } from '../app/walletBackend/ffi';

const ok = (value: string): FfiResult<string> => ({ ok: true, value });
const rejected = (): FfiResult<string> => ({
  ok: false,
  error: { code: 'Wallet', message: 'lightclient not initialized' },
});

describe('interpretWalletFetchResult — seed mode (readOnly = false)', () => {
  test('a complete payload yields the wallet', () => {
    const raw = JSON.stringify({
      seed_phrase: 'abandon ability able about above absent',
      birthday: 1_234_567,
    });
    expect(interpretWalletFetchResult(ok(raw), false)).toEqual({
      kind: 'complete',
      wallet: {
        seed: 'abandon ability able about above absent',
        birthday: 1_234_567,
      },
    });
  });

  test('a typed FFI rejection is named, and carries its code', () => {
    expect(interpretWalletFetchResult(rejected(), false)).toEqual({
      kind: 'ffiRejection',
      code: 'Wallet',
      message: 'lightclient not initialized',
    });
  });

  test('an empty payload is emptyPayload', () => {
    expect(interpretWalletFetchResult(ok(''), false)).toEqual({
      kind: 'emptyPayload',
    });
  });

  test('a non-JSON payload is malformedPayload', () => {
    expect(interpretWalletFetchResult(ok('not json at all'), false).kind).toBe(
      'malformedPayload',
    );
  });

  // EVIDENCE of the misinterpretation this replaces: fetchWallet built
  // `{} as WalletType` and copied fields only when truthy, so a payload with
  // no seed still returned a *truthy* object. The recovery-info caller in
  // LoadedApp tested `if (wallet)` and stored that empty object as the
  // user's backup.
  test('well-formed JSON without seed material is missingKeyMaterial, not a wallet', () => {
    const raw = JSON.stringify({ no_of_accounts: 1 });
    expect(interpretWalletFetchResult(ok(raw), false).kind).toBe(
      'missingKeyMaterial',
    );
  });

  // EVIDENCE: the old `if (RPCseed.birthday)` guard dropped a genesis
  // birthday of 0, which regtest wallets really have, so the stored
  // recovery info silently lost its birthday.
  test('a genesis (0) birthday survives interpretation', () => {
    const raw = JSON.stringify({ seed_phrase: 'abandon ability', birthday: 0 });
    expect(interpretWalletFetchResult(ok(raw), false)).toEqual({
      kind: 'complete',
      wallet: { seed: 'abandon ability', birthday: 0 },
    });
  });
});

describe('interpretWalletFetchResult — viewing-key mode (readOnly = true)', () => {
  test('a complete payload yields the wallet', () => {
    const raw = JSON.stringify({ ufvk: 'uview1abcdef', birthday: 2_000_000 });
    expect(interpretWalletFetchResult(ok(raw), true)).toEqual({
      kind: 'complete',
      wallet: { ufvk: 'uview1abcdef', birthday: 2_000_000 },
    });
  });

  // EVIDENCE: same truthy field-copy pattern as seed mode — a payload
  // without a ufvk still counted as a wallet.
  test('well-formed JSON without a ufvk is missingKeyMaterial, not a wallet', () => {
    const raw = JSON.stringify({ birthday: 2_000_000 });
    expect(interpretWalletFetchResult(ok(raw), true).kind).toBe(
      'missingKeyMaterial',
    );
  });

  test('a seed payload does not satisfy viewing-key mode', () => {
    const raw = JSON.stringify({ seed_phrase: 'abandon ability', birthday: 1 });
    expect(interpretWalletFetchResult(ok(raw), true).kind).toBe(
      'missingKeyMaterial',
    );
  });
});
