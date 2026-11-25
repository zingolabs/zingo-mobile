import { ChainNameEnum, remoteServer } from '@app/AppState';
import { defaultServer, keepListedServer } from '@app/services/serverPicking';
import { fetchServerList } from '@app/uris';

const mockAnswering = new Set<string>();
const mockRegistry: { uri: string; chainName: ChainNameEnum }[] = [];

jest.mock('@app/walletBackend', () => ({
  getLatestBlockServerInfo: jest.fn(async (uri: string) =>
    mockAnswering.has(uri)
      ? { ok: true, value: '3000000' }
      : { ok: false, error: { code: 'Unknown', message: 'down' } },
  ),
}));
jest.mock('@app/uris', () => ({
  ...jest.requireActual('@app/uris'),
  fetchServerList: jest.fn(async () =>
    mockRegistry.map(s => ({ ...s, latency: null, default: false })),
  ),
}));

const translate = (k: string) => k;
const main = ChainNameEnum.mainChainName;
const ZAINO = 'https://zec.global:443';
const STATIC = 'https://eu.zec.rocks:443';
const OBSOLETE = 'https://lwd1.zcash-infra.com:9067';
const REGISTRY = 'https://registry.example:443';
const UNKNOWN = 'https://unknown.example:443';

beforeEach(() => {
  mockAnswering.clear();
  mockRegistry.length = 0;
  mockRegistry.push({ uri: REGISTRY, chainName: main });
  jest.clearAllMocks();
});

test('Tests that Automatic is the chain default when the chain has one.', () => {
  expect(defaultServer(translate, main)?.uri).toBe(ZAINO);
  expect(defaultServer(translate, ChainNameEnum.regtestChainName)).toBeNull();
});

test('Tests that a list server stays when the static list holds it and it answers.', async () => {
  mockAnswering.add(STATIC);
  expect(
    await keepListedServer(translate, remoteServer(STATIC, main), true),
  ).toBe(true);
});

test('Tests that a list server stays when only the live registry holds it and it answers.', async () => {
  mockAnswering.add(REGISTRY);
  expect(
    await keepListedServer(translate, remoteServer(REGISTRY, main), true),
  ).toBe(true);
});

test('Tests that a list server gives way when the static list marks it obsolete. It answers, and the registry is not read.', async () => {
  mockAnswering.add(OBSOLETE);
  expect(
    await keepListedServer(translate, remoteServer(OBSOLETE, main), true),
  ).toBe(false);
  expect(fetchServerList).not.toHaveBeenCalled();
});

test('Tests that a list server gives way when neither list holds it. It answers.', async () => {
  mockAnswering.add(UNKNOWN);
  expect(
    await keepListedServer(translate, remoteServer(UNKNOWN, main), true),
  ).toBe(false);
});

test('Tests that a list server gives way when it does not answer. The static list holds it.', async () => {
  expect(
    await keepListedServer(translate, remoteServer(STATIC, main), true),
  ).toBe(false);
});

test('Tests that a list server stays when the registry gives nothing and the server answers. Neither list can prove it gone.', async () => {
  mockRegistry.length = 0;
  mockAnswering.add(UNKNOWN);
  expect(
    await keepListedServer(translate, remoteServer(UNKNOWN, main), true),
  ).toBe(true);
});

test('Tests that a list server stays without internet when the static list does not mark it obsolete. Nothing is fetched or timed.', async () => {
  expect(
    await keepListedServer(translate, remoteServer(STATIC, main), false),
  ).toBe(true);
  expect(fetchServerList).not.toHaveBeenCalled();
});
