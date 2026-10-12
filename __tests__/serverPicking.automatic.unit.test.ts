import { ChainNameEnum } from '@app/AppState';
import { pickAutomatic } from '@app/services/serverPicking';
import { serverUris } from '@app/uris';

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
const ZAINO = 'https://mainnet.zainod.zingolabs.dev:443';
const REGISTRY = 'https://registry.example:443';
const STATIC = 'https://eu.zec.rocks:443';

beforeEach(() => {
  mockAnswering.clear();
  mockRegistry.length = 0;
  mockRegistry.push({ uri: REGISTRY, chainName: ChainNameEnum.mainChainName });
});

test('Tests that a recommended server that answers is picked first', async () => {
  mockAnswering.add(ZAINO).add(REGISTRY).add(STATIC);
  const pick = await pickAutomatic(
    translate,
    ChainNameEnum.mainChainName,
    true,
  );
  expect(pick).toMatchObject({ server: { uri: ZAINO }, tier: 'recommended' });
});

test('Tests that the registry is used when no recommended server answers', async () => {
  mockAnswering.add(REGISTRY).add(STATIC);
  const pick = await pickAutomatic(
    translate,
    ChainNameEnum.mainChainName,
    true,
  );
  expect(pick).toMatchObject({ server: { uri: REGISTRY }, tier: 'registry' });
});

test('Tests that the static list is used when the registry gives nothing that answers', async () => {
  mockAnswering.add(STATIC);
  const pick = await pickAutomatic(
    translate,
    ChainNameEnum.mainChainName,
    true,
  );
  expect(pick).toMatchObject({ server: { uri: STATIC }, tier: 'static' });
});

test('Tests that the default server is used when nothing answers or there is no internet', async () => {
  const none = await pickAutomatic(
    translate,
    ChainNameEnum.mainChainName,
    true,
  );
  expect(none).toMatchObject({ server: { uri: ZAINO }, tier: 'default' });
  mockAnswering.add(STATIC);
  const offline = await pickAutomatic(
    translate,
    ChainNameEnum.testChainName,
    false,
  );
  expect(offline).toMatchObject({
    server: { uri: 'https://testnet.zec.rocks:443' },
    tier: 'default',
  });
});

test.each([ChainNameEnum.mainChainName, ChainNameEnum.testChainName])(
  'Tests that the %s network has exactly one default server',
  chain => {
    expect(
      serverUris(translate).filter(s => s.chainName === chain && s.default),
    ).toHaveLength(1);
  },
);
