import { ChainNameEnum, remoteServer } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import { pickAutomatic } from '@app/services/serverPicking';
import { loadDefaultIndexer } from '@app/uris/defaultIndexer';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

const indexer = RPCModule.defaultIndexerInfo as jest.Mock;

beforeEach(() => {
  indexer.mockReset();
});

test('Tests that Automatic picks the Default Indexer the Binding Layer answers for the chain.', async () => {
  indexer.mockResolvedValue('https://indexer.example:443');
  await expect(pickAutomatic(ChainNameEnum.mainChainName)).resolves.toEqual(
    remoteServer('https://indexer.example:443', ChainNameEnum.mainChainName),
  );
  expect(indexer).toHaveBeenCalledWith('main');
});

test('Tests that a chain the Binding Layer names no Default Indexer for has no Automatic pick.', async () => {
  indexer.mockResolvedValue('');
  await expect(pickAutomatic(ChainNameEnum.testChainName)).resolves.toBeNull();
});

test('Tests that the Binding Layer is asked once per chain and the answer is kept.', async () => {
  indexer.mockResolvedValue('https://indexer.example:443');
  await loadDefaultIndexer(ChainNameEnum.regtestChainName);
  await loadDefaultIndexer(ChainNameEnum.regtestChainName);
  expect(indexer).toHaveBeenCalledTimes(1);
});
