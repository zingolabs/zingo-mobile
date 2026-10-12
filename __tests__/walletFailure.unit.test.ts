import { ChainNameEnum, RouteEnum } from '@app/AppState';
import { InitStep } from '@app/AppState/types/WalletErrorInfo';
import {
  againKey,
  failedOutcome,
  initOrigin,
  nativeReply,
  retryOf,
} from '@app/LoadingApp/walletFailure';

const restore: InitStep = {
  kind: 'restore',
  seedUfvk: 'abandon',
  birthday: 2_000_000,
  origin: RouteEnum.ImportUfvk,
};

test('Tests that a native reply carrying JSON without an error field is the parsed JSON', () => {
  expect(
    nativeReply({ ok: true, value: '{"seed_phrase":"abandon","birthday":7}' }),
  ).toEqual({ kind: 'json', json: { seed_phrase: 'abandon', birthday: 7 } });
});

test('Tests that a native reply fails with the error field when the JSON carries one', () => {
  expect(nativeReply({ ok: true, value: '{"error":"no such file"}' })).toEqual({
    kind: 'failed',
    text: 'no such file',
  });
});

test('Tests that a native reply fails with the parse message when the value is no JSON', () => {
  const reply = nativeReply({ ok: true, value: 'Error: boom' });
  expect(reply.kind).toBe('failed');
  if (reply.kind === 'failed') {
    expect(reply.text).toMatch(/JSON/);
  }
});

test('Tests that a native reply fails with the empty value when the bridge answers nothing', () => {
  expect(nativeReply({ ok: true, value: '' })).toEqual({
    kind: 'failed',
    text: '',
  });
});

test('Tests that a typed chain mismatch is its own reply and keeps the message', () => {
  expect(
    nativeReply({
      ok: false,
      error: { code: 'WalletChainMismatch', message: 'wallet chain main' },
    }),
  ).toEqual({ kind: 'chainMismatch', text: 'wallet chain main' });
});

test('Tests that any other rejection fails with its message', () => {
  expect(
    nativeReply({ ok: false, error: { code: 'Wallet', message: 'locked' } }),
  ).toEqual({ kind: 'failed', text: 'locked' });
});

test('Tests that an open failing on the connection lands on the server error', () => {
  expect(failedOutcome({ kind: 'open' }, 'transport error')).toEqual({
    kind: 'error',
    error: { kind: 'server', details: 'transport error' },
  });
});

test('Tests that an open failing on anything else lands on the open error', () => {
  expect(failedOutcome({ kind: 'open' }, 'bad magic')).toEqual({
    kind: 'error',
    error: { kind: 'open', details: 'bad magic' },
  });
});

test('Tests that a create failing on the connection becomes an init error that retries the create', () => {
  const outcome = failedOutcome(
    { kind: 'create' },
    'grpc connect to https://lwd.example.com:9067 failed: transport error',
  );
  expect(outcome).toEqual({
    kind: 'error',
    error: {
      kind: 'init',
      details:
        'grpc connect to https://lwd.example.com:9067 failed: transport error',
      step: { kind: 'create' },
    },
  });
  if (outcome.kind === 'error') {
    expect(retryOf(outcome.error)).toEqual({ kind: 'create' });
    expect(againKey(outcome.error)).toBe('walleterror.still-server');
  }
});

test('Tests that a restore failing on anything but the connection becomes the alert that returns to the form', () => {
  expect(failedOutcome(restore, 'invalid seed phrase checksum')).toEqual({
    kind: 'alert',
    origin: RouteEnum.ImportUfvk,
    labelKey: 'loadingapp.readingwallet-label',
    error: 'invalid seed phrase checksum',
  });
});

test('Tests that a restore failing on the connection keeps the seed, birthday and origin for the retry', () => {
  const outcome = failedOutcome(restore, 'request timed out after 30 s');
  expect(outcome.kind).toBe('error');
  if (outcome.kind === 'error') {
    expect(retryOf(outcome.error)).toEqual(restore);
  }
  expect(initOrigin(restore)).toBe(RouteEnum.ImportUfvk);
  expect(initOrigin({ kind: 'create' })).toBe(RouteEnum.StartMenu);
});

test('Tests that a wallet on disk retries by opening whatever its error kind', () => {
  expect(retryOf({ kind: 'open', details: '' })).toEqual({ kind: 'open' });
  expect(retryOf({ kind: 'server', details: '' })).toEqual({ kind: 'open' });
  expect(
    retryOf({
      kind: 'chain',
      details: '',
      walletChain: ChainNameEnum.mainChainName,
    }),
  ).toEqual({ kind: 'open' });
  expect(againKey({ kind: 'open', details: '' })).toBe(
    'walleterror.still-open',
  );
});
