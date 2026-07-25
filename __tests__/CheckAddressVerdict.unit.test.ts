/**
 * @format
 */

import { interpretCheckAddressResult } from '../components/Receive/components/checkAddressVerdict';
import { FfiResult } from '../app/walletBackend/ffi';

const ok = (value: string): FfiResult<string> => ({ ok: true, value });
const rejected = (): FfiResult<string> => ({
  ok: false,
  error: { code: 'InvalidInput', message: 'bad address' },
});

describe('interpretCheckAddressResult', () => {
  test('is_wallet_address true is a positive verdict', () => {
    const raw = JSON.stringify({ is_wallet_address: true, account_id: 0 });
    expect(interpretCheckAddressResult(ok(raw))).toEqual({ kind: 'mine' });
  });

  test('is_wallet_address false is a negative verdict', () => {
    const raw = JSON.stringify({ is_wallet_address: false, account_id: 0 });
    expect(interpretCheckAddressResult(ok(raw))).toEqual({ kind: 'notMine' });
  });

  test('a typed FFI rejection is named, and carries its code', () => {
    expect(interpretCheckAddressResult(rejected())).toEqual({
      kind: 'ffiRejection',
      code: 'InvalidInput',
      message: 'bad address',
    });
  });

  // EVIDENCE of the misinterpretation this replaces: the screen stored
  // `is_wallet_address` straight off JSON.parse behind a `verifyOK !== null`
  // render gate, so a well-formed payload lacking the field stored
  // `undefined`, passed the gate, and rendered the definitive "this address
  // does not belong to you" — a confident false negative produced by a
  // check that never returned a verdict.
  test('a payload without is_wallet_address is malformed, not "not your address"', () => {
    const raw = JSON.stringify({ encoded_address: 'u1aaa' });
    expect(interpretCheckAddressResult(ok(raw)).kind).toBe('malformed');
  });

  // EVIDENCE, same gate: a truthy non-boolean must not read as "yours".
  test('a non-boolean is_wallet_address is malformed, not a verdict', () => {
    const raw = JSON.stringify({ is_wallet_address: 'yes' });
    expect(interpretCheckAddressResult(ok(raw)).kind).toBe('malformed');
  });

  // EVIDENCE: a parse failure used to be swallowed by a bare catch, so the
  // user tapped Verify and nothing happened at all.
  test('an unparseable or empty payload is malformed, never silent', () => {
    expect(interpretCheckAddressResult(ok('not json')).kind).toBe('malformed');
    expect(interpretCheckAddressResult(ok('')).kind).toBe('malformed');
  });
});
