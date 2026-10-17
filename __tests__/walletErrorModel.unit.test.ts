import { ChainNameEnum, RouteEnum, remoteServer } from '@app/AppState';
import { offlineServer } from '@app/AppState/types/ServerType';
import { errorScreen } from '@screens/WalletError/walletErrorModel';

const testnet = remoteServer(
  'https://testnet.example:443',
  ChainNameEnum.testChainName,
);

test('Tests that an init error reads as a server error with Retry as the primary and Back below it', () => {
  const model = errorScreen(
    { kind: 'init', details: 'transport error', step: { kind: 'create' } },
    testnet,
  );
  expect(model.icon).toBe('server');
  expect(model.title).toEqual({
    kind: 'host',
    key: 'walleterror.server-title',
    host: 'testnet.example:443',
  });
  expect(model.primary).toEqual({
    label: { kind: 'plain', key: 'walleterror.retry' },
    action: { kind: 'retry' },
    testID: 'walleterror.retry',
  });
  expect(model.top).toEqual({ kind: 'none' });
  expect(model.bottom).toMatchObject({
    kind: 'link',
    link: { action: { kind: 'back' }, testID: 'walleterror.back' },
  });
});

test('Tests that a wallet on disk keeps Open, Import and Create whatever the error kind', () => {
  for (const kind of ['open', 'server'] as const) {
    const model = errorScreen({ kind, details: '' }, testnet);
    expect(model.primary.action).toEqual({ kind: 'retry' });
    expect(model.primary.testID).toBe('walleterror.open');
    expect(model.top).toMatchObject({
      kind: 'link',
      link: { action: { kind: 'import' } },
    });
    expect(model.bottom).toMatchObject({
      kind: 'link',
      link: { action: { kind: 'create' } },
    });
  }
});

test('Tests that a network mismatch offers the switch as the primary and More options above it', () => {
  const model = errorScreen(
    {
      kind: 'chain',
      details: '',
      walletChain: ChainNameEnum.mainChainName,
    },
    testnet,
  );
  expect(model.badge).toEqual({
    kind: 'net',
    chain: ChainNameEnum.mainChainName,
  });
  expect(model.chips).toEqual({
    kind: 'nets',
    wallet: ChainNameEnum.mainChainName,
    server: ChainNameEnum.testChainName,
  });
  expect(model.primary.action).toEqual({
    kind: 'chain',
    chain: ChainNameEnum.mainChainName,
  });
  expect(model.top).toMatchObject({
    kind: 'link',
    link: { action: { kind: 'more', chain: ChainNameEnum.mainChainName } },
  });
  expect(model.bottom).toEqual({ kind: 'none' });
});

test('Tests that the host line is empty when the server is offline', () => {
  const model = errorScreen(
    {
      kind: 'init',
      details: '',
      step: {
        kind: 'restore',
        seedUfvk: 'abandon',
        birthday: 0,
        origin: RouteEnum.ImportUfvk,
      },
    },
    offlineServer(ChainNameEnum.mainChainName),
  );
  expect(model.sub).toEqual({
    kind: 'host',
    key: 'walleterror.server-sub',
    host: '',
  });
});
