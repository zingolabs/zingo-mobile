jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('@app/walletBackend/utils/walletUtils', () => ({
  ...jest.requireActual('@app/walletBackend/utils/walletUtils'),
  doSave: jest.fn().mockResolvedValue(true),
  loadExistingWallet: jest
    .fn()
    .mockResolvedValue({ ok: false, error: { message: 'no route' } }),
  changeServer: jest.fn().mockResolvedValue({ ok: true, value: 'ok' }),
}));

// The settings file holds the server the change falls back to.
jest.mock('@app/services/SettingsFileImpl', () => {
  const actual = jest.requireActual('@app/services/SettingsFileImpl').default;
  const { remoteServer, ChainNameEnum, SelectServerEnum } =
    jest.requireActual('@app/AppState');
  actual.readSettings = jest.fn().mockResolvedValue({
    server: remoteServer('https://zec.rocks:443', ChainNameEnum.mainChainName),
    selectServer: SelectServerEnum.auto,
  });
  actual.writeServer = jest.fn().mockResolvedValue(undefined);
  actual.writeSettings = jest.fn().mockResolvedValue(undefined);
  return { __esModule: true, default: actual };
});

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: jest.fn().mockImplementation(supportedLocales => ({
    languageTag: supportedLocales?.[0] || 'en',
    isRTL: false,
  })),
}));

jest.mock('i18n-js');

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: Object.assign(() => null, { show: jest.fn(), hide: jest.fn() }),
}));

jest.mock('@app/services/gateController', () => ({
  ...jest.requireActual('@app/services/gateController'),
  resolveTriggerGate: jest.fn().mockResolvedValue({ kind: 'passed' }),
}));

jest.mock('@ui/widgets/PriceFetcher', () => ({
  ...jest.requireActual('@ui/widgets/PriceFetcher'),
  PriceTrafficDriver: () => null,
}));

jest.mock('@screens/History', () => ({
  __esModule: true,
  default: 'MockHistoryScreen',
}));
jest.mock('@screens/Send', () => ({
  __esModule: true,
  default: 'MockSendScreen',
}));
jest.mock('@screens/Receive', () => ({
  __esModule: true,
  default: 'MockReceiveScreen',
}));

import { act } from '@testing-library/react-native';
import { ChainNameEnum, SelectServerEnum, remoteServer } from '@app/AppState';
import { mountCommitted } from './helpers/loadedAppHarness';

const testnet = remoteServer(
  'https://testnet.example:443',
  ChainNameEnum.testChainName,
);
const other = remoteServer(
  'https://other.example:443',
  ChainNameEnum.mainChainName,
);

describe('a server change that does not land', () => {
  it('Tests that the poll loop runs again when the wallet fails to open on the new server', async () => {
    const { utils, instance } = await mountCommitted();
    const configure = jest.spyOn(instance.rpc, 'configure');

    let result: unknown;
    await act(async () => {
      result = await instance.setServerOption(
        other,
        SelectServerEnum.list,
        false,
        true,
      );
    });

    expect(result).toEqual(expect.objectContaining({ kind: 'error' }));
    expect(configure).toHaveBeenCalled();
    await act(async () => {
      await instance.rpc.clearTimers();
    });
    utils.unmount();
  });

  it('Tests that the poll loop runs again when the new server is on another chain', async () => {
    const { utils, instance } = await mountCommitted();
    const configure = jest.spyOn(instance.rpc, 'configure');

    let result: unknown;
    await act(async () => {
      result = await instance.setServerOption(
        testnet,
        SelectServerEnum.list,
        false,
        false,
      );
    });

    expect(result).toEqual({ kind: 'chain-changed' });
    expect(configure).toHaveBeenCalled();
    await act(async () => {
      await instance.rpc.clearTimers();
    });
    utils.unmount();
  });
});
