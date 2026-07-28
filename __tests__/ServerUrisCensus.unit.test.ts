jest.mock('../app/RPCModule', () => ({
  __esModule: true,
  default: {} as { indexerCensus?: string },
}));

import RPCModule from '../app/RPCModule';
import serverUris from '../app/uris/serverUris';
import { ChainNameEnum } from '../app/AppState';

const mocked = RPCModule as unknown as { indexerCensus?: string };
const translate = (key: string) => `t:${key}`;

describe('serverUris census projection', () => {
  afterEach(() => {
    delete mocked.indexerCensus;
  });

  it('projects the native census: fields, chains, and region translation', () => {
    mocked.indexerCensus = JSON.stringify([
      {
        uri: 'https://zec.rocks:443',
        chain: 'main',
        operator: 'zec.rocks',
        region_key: 'usa',
        is_default: true,
        obsolete: false,
      },
      {
        uri: 'https://testnet.zec.rocks:443',
        chain: 'test',
        operator: 'zec.rocks',
        region_key: '',
        is_default: true,
        obsolete: false,
      },
    ]);
    expect(serverUris(translate)).toEqual([
      {
        uri: 'https://zec.rocks:443',
        region: 't:settings.usa',
        chainName: ChainNameEnum.mainChainName,
        default: true,
        latency: null,
        obsolete: false,
      },
      {
        uri: 'https://testnet.zec.rocks:443',
        region: '',
        chainName: ChainNameEnum.testChainName,
        default: true,
        latency: null,
        obsolete: false,
      },
    ]);
  });

  it('falls back to the static list only when the census is absent', () => {
    const fallback = serverUris(translate);
    expect(fallback.length).toBeGreaterThan(0);
    expect(
      fallback.find(
        server =>
          server.chainName === ChainNameEnum.mainChainName && server.default,
      )?.uri,
    ).toEqual('https://zec.rocks:443');
  });

  it('degrades a malformed census to the fallback whole, never partially', () => {
    mocked.indexerCensus = JSON.stringify([{ uri: 'https://zec.rocks:443' }]);
    const projected = serverUris(translate);
    delete mocked.indexerCensus;
    expect(projected).toEqual(serverUris(translate));
  });
});
