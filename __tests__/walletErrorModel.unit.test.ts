import { ChainNameEnum, RouteEnum, remoteServer } from '@app/AppState';
import { offlineServer } from '@app/AppState/types/ServerType';
import { Step } from '@app/AppState/types/WalletErrorInfo';
import { errorScreen } from '@screens/WalletError/walletErrorModel';

const testnet = remoteServer(
  'https://testnet.example:443',
  ChainNameEnum.testChainName,
);
const open: Step = { kind: 'open' };
const restore: Step = {
  kind: 'restore',
  seedUfvk: 'abandon',
  birthday: 0,
  origin: RouteEnum.ImportUfvk,
};

test('Tests that a create that could not reach the server reads as a server error with Retry as the primary and Back below it', () => {
  const model = errorScreen(
    {
      cause: { kind: 'connection' },
      step: { kind: 'create' },
      details: 'transport error',
    },
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

test('Tests that a restore whose key the server refused names the key and only goes back', () => {
  const model = errorScreen(
    { cause: { kind: 'key' }, step: restore, details: 'Mnemonic error' },
    testnet,
  );
  expect(model.icon).toBe('wallet');
  expect(model.title).toEqual({ kind: 'plain', key: 'walleterror.key-title' });
  expect(model.sub).toEqual({ kind: 'plain', key: 'walleterror.key-sub' });
  expect(model.primary).toEqual({
    label: { kind: 'plain', key: 'walleterror.back' },
    action: { kind: 'back' },
    testID: 'walleterror.back',
  });
  expect(model.top).toEqual({ kind: 'none' });
  expect(model.bottom).toEqual({ kind: 'none' });
});

test('Tests that a wallet on disk keeps Open, Import and Create whatever its cause', () => {
  const causes = [
    { kind: 'unknown' },
    { kind: 'connection' },
    { kind: 'file' },
  ] as const;
  for (const cause of causes) {
    const model = errorScreen({ cause, step: open, details: '' }, testnet);
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

test('Tests that the head follows the cause of an open', () => {
  const head = (kind: 'unknown' | 'connection' | 'file') =>
    errorScreen({ cause: { kind }, step: open, details: '' }, testnet);
  expect(head('unknown').icon).toBe('wallet');
  expect(head('unknown').title).toEqual({
    kind: 'plain',
    key: 'walleterror.open-title',
  });
  expect(head('connection').icon).toBe('server');
  expect(head('connection').sub).toEqual({
    kind: 'host',
    key: 'walleterror.server-sub',
    host: 'testnet.example:443',
  });
  expect(head('file').icon).toBe('wallet');
  expect(head('file').title).toEqual({
    kind: 'plain',
    key: 'walleterror.file-title',
  });
});

test('Tests that a network mismatch offers the switch as the primary and More options above it', () => {
  const model = errorScreen(
    {
      cause: { kind: 'chain', walletChain: ChainNameEnum.mainChainName },
      step: open,
      details: '',
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
    { cause: { kind: 'connection' }, step: restore, details: '' },
    offlineServer(ChainNameEnum.mainChainName),
  );
  expect(model.sub).toEqual({
    kind: 'host',
    key: 'walleterror.server-sub',
    host: '',
  });
});

test('Tests that a birthday the server refused names the birthday and only goes back', () => {
  const model = errorScreen(
    { cause: { kind: 'birthday' }, step: restore, details: 'below sapling' },
    testnet,
  );
  expect(model.icon).toBe('wallet');
  expect(model.title).toEqual({
    kind: 'plain',
    key: 'walleterror.birthday-title',
  });
  expect(model.primary.action).toEqual({ kind: 'back' });
  expect(model.top).toEqual({ kind: 'none' });
  expect(model.bottom).toEqual({ kind: 'none' });
});

test('Tests that a create or restore failing for no known cause names its step and offers Retry and Back', () => {
  const restored = errorScreen(
    { cause: { kind: 'unknown' }, step: restore, details: 'boom' },
    testnet,
  );
  expect(restored.title).toEqual({
    kind: 'plain',
    key: 'walleterror.restore-title',
  });
  expect(restored.sub).toEqual({
    kind: 'plain',
    key: 'walleterror.restore-sub',
  });
  expect(restored.primary.action).toEqual({ kind: 'retry' });
  expect(restored.bottom).toMatchObject({
    kind: 'link',
    link: { action: { kind: 'back' } },
  });
  const created = errorScreen(
    { cause: { kind: 'unknown' }, step: { kind: 'create' }, details: 'boom' },
    testnet,
  );
  expect(created.title).toEqual({
    kind: 'plain',
    key: 'walleterror.create-title',
  });
});
