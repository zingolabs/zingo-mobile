/**
 * @format
 */

import { FfiJsonDecode } from '../app/walletBackend/ffi';
import { interpretServerProbe } from '../app/walletBackend/utils/connectionProbe';

const json = (value: unknown): FfiJsonDecode => ({
  kind: 'json',
  value,
  raw: JSON.stringify(value),
});

const leg = { ok: true, detail: 'chain main, height 3110000', millis: 412 };

describe('interpretServerProbe', () => {
  test('a typed FFI rejection passes through with its code', () => {
    const outcome = interpretServerProbe({
      kind: 'ffiRejection',
      code: 'InvalidInput',
      message: 'unparseable server uri: nonsense',
    });
    expect(outcome).toEqual({
      kind: 'ffiRejection',
      code: 'InvalidInput',
      message: 'unparseable server uri: nonsense',
    });
  });

  test('an empty payload is malformed, never silently dropped', () => {
    expect(interpretServerProbe({ kind: 'emptyPayload' })).toEqual({
      kind: 'malformedPayload',
      payload: '',
      detail: 'empty payload',
    });
  });

  test('a non-array payload is malformed and travels for diagnosis', () => {
    const outcome = interpretServerProbe(json({ host: 'zec.rocks' }));
    expect(outcome.kind).toEqual('malformedPayload');
  });

  test('a report with a mixnet leg carries both legs typed', () => {
    const outcome = interpretServerProbe(
      json([{ host: 'zec.rocks', clearnet: leg, mixnet: leg }]),
    );
    expect(outcome).toEqual({
      kind: 'report',
      reports: [{ host: 'zec.rocks', clearnet: leg, mixnet: leg }],
    });
  });

  test('a null mixnet leg names the not-carried case, not a bare absence', () => {
    const outcome = interpretServerProbe(
      json([{ host: 'zec.rocks', clearnet: leg, mixnet: null }]),
    );
    expect(outcome).toEqual({
      kind: 'report',
      reports: [{ host: 'zec.rocks', clearnet: leg, mixnet: null }],
    });
  });

  test('an entry with a mangled leg rejects the whole payload as malformed', () => {
    const outcome = interpretServerProbe(
      json([{ host: 'zec.rocks', clearnet: { ok: 'yes' } }]),
    );
    expect(outcome.kind).toEqual('malformedPayload');
  });
});
