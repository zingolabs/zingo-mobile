import { ChainNameEnum, RouteEnum } from '@app/AppState';
import { InitStep } from '@app/AppState/types/WalletErrorInfo';
import {
  againKey,
  initOrigin,
  initOutcome,
  retryOf,
} from '@app/LoadingApp/walletFailure';

const restore: InitStep = {
  kind: 'restore',
  seedUfvk: 'abandon',
  birthday: 2_000_000,
  origin: RouteEnum.ImportUfvk,
};

test('Tests that a create failing on the connection becomes an init error that retries the create', () => {
  const outcome = initOutcome(
    { kind: 'create' },
    'grpc connect to https://lwd.example.com:9067 failed: transport error',
  );
  expect(outcome).toEqual({
    kind: 'screen',
    error: {
      kind: 'init',
      details:
        'grpc connect to https://lwd.example.com:9067 failed: transport error',
      step: { kind: 'create' },
    },
  });
  if (outcome.kind === 'screen') {
    expect(retryOf(outcome.error)).toEqual({ kind: 'create' });
    expect(againKey(outcome.error)).toBe('walleterror.still-server');
  }
});

test('Tests that a restore failing on anything but the connection keeps the alert and returns to the form', () => {
  expect(initOutcome(restore, 'invalid seed phrase checksum')).toEqual({
    kind: 'alert',
    origin: RouteEnum.ImportUfvk,
    labelKey: 'loadingapp.readingwallet-label',
    error: 'invalid seed phrase checksum',
  });
});

test('Tests that a restore failing on the connection keeps the seed, birthday and origin for the retry', () => {
  const outcome = initOutcome(restore, 'request timed out after 30 s');
  expect(outcome.kind).toBe('screen');
  if (outcome.kind === 'screen') {
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
