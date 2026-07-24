/**
 * The funnel itself (app/walletBackend/ffi.ts): toFfiError is the one
 * place a native rejection becomes a typed FfiError, and callFfi is the
 * one place a native promise becomes a discriminated FfiResult. These pin
 * the funnel's edge branches directly — the wrapper suites exercise it
 * only through Error-shaped rejections carrying known codes.
 */
import { callFfi, toFfiError } from '../app/walletBackend/ffi';

describe('toFfiError maps every rejection shape to a typed FfiError', () => {
  it('keeps a known code and the Error message verbatim', () => {
    const rejection = Object.assign(new Error('plan hash moved'), {
      code: 'MigrationConsentStale',
    });
    expect(toFfiError(rejection)).toEqual({
      code: 'MigrationConsentStale',
      message: 'plan hash moved',
    });
  });

  it('maps an unrecognized code to Unknown without losing the message', () => {
    const rejection = Object.assign(new Error('boom'), { code: 'Bogus' });
    expect(toFfiError(rejection)).toEqual({ code: 'Unknown', message: 'boom' });
  });

  it('maps an Error without a code to Unknown', () => {
    expect(toFfiError(new Error('boom'))).toEqual({
      code: 'Unknown',
      message: 'boom',
    });
  });

  it('maps a thrown string to Unknown carrying the string', () => {
    expect(toFfiError('boom')).toEqual({ code: 'Unknown', message: 'boom' });
  });

  it('maps null and undefined rejections to Unknown', () => {
    expect(toFfiError(null)).toEqual({ code: 'Unknown', message: 'null' });
    expect(toFfiError(undefined)).toEqual({
      code: 'Unknown',
      message: 'undefined',
    });
  });

  it('maps a non-string code value to Unknown', () => {
    const rejection = Object.assign(new Error('boom'), { code: 42 });
    expect(toFfiError(rejection)).toEqual({ code: 'Unknown', message: 'boom' });
  });

  it('never invents a code from message prose', () => {
    // The anti-in-band tripwire: prose that names a variant must not be
    // promoted into that variant's code — codes come from `.code` alone.
    const rejection = new Error('Error: MigrationConsentStale: plan moved');
    expect(toFfiError(rejection).code).toBe('Unknown');
  });
});

describe('callFfi funnels the promise channel into the union', () => {
  it('resolutions cross as ok, even when they wear error prose', () => {
    // Classification is by channel, never by content.
    const proseLikeData = 'Error: looks like prose but is legitimate data';
    return expect(callFfi(Promise.resolve(proseLikeData))).resolves.toEqual({
      ok: true,
      value: proseLikeData,
    });
  });

  it('rejections cross as typed errors, never as resolved prose', () => {
    const rejection = Object.assign(new Error('no migration'), {
      code: 'MigrationNotInProgress',
    });
    return expect(callFfi(Promise.reject(rejection))).resolves.toEqual({
      ok: false,
      error: { code: 'MigrationNotInProgress', message: 'no migration' },
    });
  });
});
