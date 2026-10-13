import { ChainNameEnum, RouteEnum } from '@app/AppState';
import { Cause, Step } from '@app/AppState/types/WalletErrorInfo';
import { FfiErrorCode } from '@app/walletBackend';
import {
  againOf,
  causeOf,
  failedOutcome,
  initOrigin,
  nativeReply,
  retryOf,
} from '@app/LoadingApp/walletFailure';

const open: Step = { kind: 'open' };
const create: Step = { kind: 'create' };
const restore: Step = {
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

test('Tests that a native reply fails without a code when the JSON carries an error field', () => {
  expect(nativeReply({ ok: true, value: '{"error":"no such file"}' })).toEqual({
    kind: 'failed',
    code: 'Unknown',
    text: 'no such file',
  });
});

test('Tests that a native reply fails with the parse message when the value is no JSON', () => {
  const reply = nativeReply({ ok: true, value: 'Error: boom' });
  expect(reply.kind).toBe('failed');
  if (reply.kind === 'failed') {
    expect(reply.code).toBe('Unknown');
    expect(reply.text).toMatch(/JSON/);
  }
});

test('Tests that a native reply fails with the empty value when the bridge answers nothing', () => {
  expect(nativeReply({ ok: true, value: '' })).toEqual({
    kind: 'failed',
    code: 'Unknown',
    text: '',
  });
});

test('Tests that a typed chain mismatch is its own reply and keeps the message', () => {
  expect(
    nativeReply({
      ok: false,
      error: { code: 'WalletChainMismatch', message: 'wallet chain main' },
    }),
  ).toEqual({
    kind: 'chainMismatch',
    code: 'WalletChainMismatch',
    text: 'wallet chain main',
  });
});

test('Tests that any other rejection fails with its code and message', () => {
  expect(
    nativeReply({ ok: false, error: { code: 'Wallet', message: 'locked' } }),
  ).toEqual({ kind: 'failed', code: 'Wallet', text: 'locked' });
});

test.each<[FfiErrorCode, Cause]>([
  ['InitConnection', { kind: 'connection' }],
  ['Indexer', { kind: 'connection' }],
  ['InitKey', { kind: 'key' }],
  ['InvalidInput', { kind: 'key' }],
  ['InitBirthday', { kind: 'birthday' }],
  ['InitWalletFile', { kind: 'file' }],
])(
  'Tests that the %s code names its cause whatever the message says',
  (code, cause) => {
    expect(causeOf({ code, text: 'transport error' })).toEqual(cause);
  },
);

test('Tests that a code without a cause falls back to the message text', () => {
  expect(causeOf({ code: 'Init', text: 'transport error' })).toEqual({
    kind: 'connection',
  });
  expect(causeOf({ code: 'Unknown', text: 'bad magic' })).toEqual({
    kind: 'unknown',
  });
});

test('Tests that an open lands on the error screen whatever its cause', () => {
  expect(failedOutcome(open, { code: 'Init', text: 'bad magic' })).toEqual({
    kind: 'error',
    error: { cause: { kind: 'unknown' }, step: open, details: 'bad magic' },
  });
  expect(
    failedOutcome(open, { code: 'InitWalletFile', text: 'bad header' }),
  ).toEqual({
    kind: 'error',
    error: { cause: { kind: 'file' }, step: open, details: 'bad header' },
  });
});

test('Tests that a create failing on the connection becomes an error that retries the create', () => {
  const outcome = failedOutcome(create, {
    code: 'InitConnection',
    text: 'grpc connect to https://lwd.example.com:9067 failed: transport error',
  });
  expect(outcome).toEqual({
    kind: 'error',
    error: {
      cause: { kind: 'connection' },
      step: create,
      details:
        'grpc connect to https://lwd.example.com:9067 failed: transport error',
    },
  });
  if (outcome.kind === 'error') {
    expect(retryOf(outcome.error)).toEqual(create);
    expect(againOf(outcome.error)).toEqual({
      kind: 'say',
      key: 'walleterror.still-server',
    });
  }
});

test('Tests that a restore whose key the server refused lands on the screen and says nothing on a retry', () => {
  const outcome = failedOutcome(restore, {
    code: 'InitKey',
    text: 'Mnemonic error. invalid checksum',
  });
  expect(outcome).toEqual({
    kind: 'error',
    error: {
      cause: { kind: 'key' },
      step: restore,
      details: 'Mnemonic error. invalid checksum',
    },
  });
  if (outcome.kind === 'error') {
    expect(againOf(outcome.error)).toEqual({ kind: 'quiet' });
  }
});

test('Tests that a create or restore failing for no known cause lands on the screen and names its step on a retry', () => {
  const failed = { code: 'Init', text: 'Not a valid chain hint' } as const;
  const restored = failedOutcome(restore, failed);
  expect(restored).toEqual({
    kind: 'error',
    error: {
      cause: { kind: 'unknown' },
      step: restore,
      details: 'Not a valid chain hint',
    },
  });
  if (restored.kind === 'error') {
    expect(againOf(restored.error)).toEqual({
      kind: 'say',
      key: 'walleterror.still-restore',
    });
  }
  const created = failedOutcome(create, failed);
  if (created.kind === 'error') {
    expect(againOf(created.error)).toEqual({
      kind: 'say',
      key: 'walleterror.still-create',
    });
  }
});

test('Tests that a restore failing on the wallet file becomes the alert that returns to the form', () => {
  expect(
    failedOutcome(restore, { code: 'InitWalletFile', text: 'bad header' }),
  ).toEqual({
    kind: 'alert',
    origin: RouteEnum.ImportUfvk,
    labelKey: 'loadingapp.readingwallet-label',
    error: 'bad header',
  });
  expect(initOrigin(restore)).toBe(RouteEnum.ImportUfvk);
  expect(initOrigin({ kind: 'create' })).toBe(RouteEnum.StartMenu);
});

test('Tests that a message naming the network no longer decides when the code names the key', () => {
  const outcome = failedOutcome(restore, {
    code: 'InitKey',
    text: 'ufvk network mismatch',
  });
  expect(outcome.kind).toBe('error');
  if (outcome.kind === 'error') {
    expect(outcome.error.cause).toEqual({ kind: 'key' });
  }
});

test('Tests that a wallet on disk retries by opening whatever its cause', () => {
  const details = '';
  expect(retryOf({ cause: { kind: 'unknown' }, step: open, details })).toEqual(
    open,
  );
  expect(
    retryOf({ cause: { kind: 'connection' }, step: open, details }),
  ).toEqual(open);
  expect(
    retryOf({
      cause: { kind: 'chain', walletChain: ChainNameEnum.mainChainName },
      step: open,
      details,
    }),
  ).toEqual(open);
  expect(againOf({ cause: { kind: 'unknown' }, step: open, details })).toEqual({
    kind: 'say',
    key: 'walleterror.still-open',
  });
  expect(againOf({ cause: { kind: 'file' }, step: open, details })).toEqual({
    kind: 'say',
    key: 'walleterror.still-open',
  });
  expect(
    againOf({
      cause: { kind: 'chain', walletChain: ChainNameEnum.mainChainName },
      step: open,
      details,
    }),
  ).toEqual({ kind: 'quiet' });
});
