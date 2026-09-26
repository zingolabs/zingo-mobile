/**
 * Two wallet-local reads an Offline session could not get at
 * (zingo-mobile#1427). Both asked the server first and both rejected there —
 * an empty URI fails `http::Uri` parsing before any dial — so neither ever
 * reached the publication the screens wait on:
 *
 *   - the value transfers: History clears its spinner on the first
 *     publication, so an Offline wallet span forever over an empty list;
 *   - the server info: LoadedApp's `setInfo` is what rescues an empty
 *     `currencyName` from the wallet's own chain, so the amounts showed
 *     neither ZEC nor TAZ although the wallet's chain was never in doubt.
 */
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { DataService } from '@app/walletBackend/modules/DataService';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import type { WalletBackendConfig } from '@app/walletBackend/config/WalletBackendConfig';
import type { ServerType } from '@app/AppState';
import {
  mockOfflineServer as OFFLINE,
  mockServer as ONLINE,
} from '../__mocks__/dataMocks/mockServer';

const mockedBridge = RPCModule as unknown as Record<string, jest.Mock>;

function serviceFor(server: ServerType) {
  const onValueTransfersChanged = jest.fn();
  const onInfoChanged = jest.fn();
  const onError = jest.fn();
  const config = {
    onValueTransfersChanged,
    onInfoChanged,
    onError,
    onMessagesChanged: jest.fn(),
    onBalanceChanged: jest.fn(),
    onAddressesChanged: jest.fn(),
    onSyncStatusChanged: jest.fn(),
    keepAwake: jest.fn(),
    performanceLevel: RPCPerformanceLevelEnum.High,
    server,
  } as unknown as WalletBackendConfig;
  const service = new DataService(config);
  // The reconfigure the error path triggers is out of scope here.
  service.onSyncError = jest.fn();
  return { service, onValueTransfersChanged, onInfoChanged, onError };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedBridge.getValueTransfersList.mockResolvedValue(
    JSON.stringify({ value_transfers: [] }),
  );
});

describe('the wallet-local reads an Offline session still needs', () => {
  it('publishes the value transfers without asking any server', async () => {
    const { service, onValueTransfersChanged, onError } = serviceFor(OFFLINE);

    await service.fetchTandZandOValueTransfers();

    expect(mockedBridge.getLatestBlockServerInfo).not.toHaveBeenCalled();
    // The publication History waits on, even for an empty wallet.
    expect(onValueTransfersChanged).toHaveBeenCalledWith([], 0);
    expect(onError).not.toHaveBeenCalled();
  });

  it('publishes an empty info so the chain rescue can run', async () => {
    const { service, onInfoChanged, onError } = serviceFor(OFFLINE);

    await service.fetchInfoAndServerHeight();

    expect(mockedBridge.infoServerInfo).not.toHaveBeenCalled();
    expect(onInfoChanged).toHaveBeenCalledWith(
      expect.objectContaining({ latestBlock: 0, serverUri: '' }),
    );
    expect(onError).not.toHaveBeenCalled();
  });

  // The controls: a connected session still asks.
  it('asks for the server height when there is a server', async () => {
    mockedBridge.getLatestBlockServerInfo.mockResolvedValue('3495276');
    const { service, onValueTransfersChanged } = serviceFor(ONLINE);

    await service.fetchTandZandOValueTransfers();

    expect(mockedBridge.getLatestBlockServerInfo).toHaveBeenCalledWith(
      ONLINE.uri,
    );
    expect(onValueTransfersChanged).toHaveBeenCalledWith([], 0);
  });

  it('asks for the server info when there is a server', async () => {
    mockedBridge.infoServerInfo.mockResolvedValue(
      JSON.stringify({
        latest_block_height: 3495276,
        chain_name: 'main',
        server_uri: ONLINE.uri,
        vendor: 'zingo',
        git_commit: 'abcdef123',
        version: '1.0',
      }),
    );
    const { service, onInfoChanged } = serviceFor(ONLINE);

    await service.fetchInfoAndServerHeight();

    expect(mockedBridge.infoServerInfo).toHaveBeenCalled();
    expect(onInfoChanged).toHaveBeenCalledWith(
      expect.objectContaining({ currencyName: 'ZEC' }),
    );
  });
});
