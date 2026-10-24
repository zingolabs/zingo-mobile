import { ChainNameEnum } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import { loadDefaultIndexer } from '@app/uris/defaultIndexer';
import { serverUris } from '@app/uris';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

const indexer = RPCModule.defaultIndexerInfo as jest.Mock;
const translate = (key: string) => key;

beforeEach(() => {
  indexer.mockReset();
});

test('Tests that the mainnet default server is the Default Indexer the Binding Layer answers, once it has answered.', async () => {
  indexer.mockResolvedValue('https://indexer.example:443');
  await loadDefaultIndexer(ChainNameEnum.mainChainName);
  const defaults = serverUris(translate).filter(
    s => s.chainName === ChainNameEnum.mainChainName && s.default,
  );
  expect(defaults).toHaveLength(1);
  expect(defaults[0].uri).toBe('https://indexer.example:443');
  expect(defaults[0].recommended).toBe(true);
  expect(indexer).toHaveBeenCalledWith('main');
});

test('Tests that the Binding Layer is asked once per chain and the answer is kept.', async () => {
  indexer.mockResolvedValue('https://indexer.example:443');
  await loadDefaultIndexer(ChainNameEnum.regtestChainName);
  await loadDefaultIndexer(ChainNameEnum.regtestChainName);
  expect(indexer).toHaveBeenCalledTimes(1);
});
