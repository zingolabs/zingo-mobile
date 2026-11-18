/**
 * @format
 */

import 'react-native';

import { LoadingAppClass } from '@app/LoadingApp';
import {
  ChainNameEnum,
  LanguageEnum,
  LaunchingModeEnum,
  SelectServerEnum,
} from '@app/AppState';
import { remoteServer } from '@app/AppState/types/ServerType';
import RPCModule from '@app/RPCModule';
import { registerConfirmListener } from '@app/services/showConfirm';
import type { RecoveryEntry } from '@app/services/recoveryWalletInfo';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);
jest.mock('@app/services/gateController', () => ({
  ...jest.requireActual('@app/services/gateController'),
  askGate: jest.fn(async () => ({ kind: 'passed' })),
}));
jest.mock('@app/services/serverPicking', () => ({
  ...jest.requireActual('@app/services/serverPicking'),
  probeUri: jest.fn(async () => ({ latency: 40, height: '3000000' })),
}));

// The start menu on a mainnet server.
const appWithSaved = () => {
  const app = new LoadingAppClass({
    session: { kind: 'boot', startingApp: true, newWallet: false },
    openWallet: jest.fn(),
    openOnboarding: jest.fn(),
    openBoot: jest.fn(),
    translate: (key: string) => key,
    language: LanguageEnum.en,
    server: remoteServer(
      'https://mainnet.example:443',
      ChainNameEnum.mainChainName,
    ),
    privacy: false,
    backgroundSyncInfo: { batches: 0, message: '', date: 0, dateEnd: 0 },
    firstLaunchingMessage: LaunchingModeEnum.opening,
    biometrics: false,
    selectServer: SelectServerEnum.auto,
  } as never);
  app.state = {
    ...app.state,
    netInfo: { ...app.state.netInfo, isConnected: true },
  };
  const doRestore = jest.spyOn(app, 'doRestore').mockResolvedValue(undefined);
  return { app, doRestore };
};

afterEach(() => {
  jest.clearAllMocks();
  registerConfirmListener(null);
});

const entry = (over: Partial<RecoveryEntry>): RecoveryEntry => ({
  seed: 'abandon ability able',
  birthday: 2900000,
  walletId: '',
  name: '',
  chain: '',
  category: 0,
  order: 0,
  server: { kind: 'none' },
  ...over,
});

const restoredWith = async (app: LoadingAppClass, saved: RecoveryEntry) => {
  jest.spyOn(app, 'setState').mockImplementation(() => {});
  const restore = jest.mocked(RPCModule.restoreWalletFromSeed);
  restore.mockRejectedValue(new Error('stop here'));
  await app.importAllRecovery([saved]);
  return restore.mock.calls[0];
};

test('Tests that a single-wallet entry restores on Mainnet when the start menu is on Testnet. Those entries predate networks and were all Mainnet.', async () => {
  const { app } = appWithSaved();
  app.state = {
    ...app.state,
    server: remoteServer(
      'https://testnet.example:443',
      ChainNameEnum.testChainName,
    ),
  };

  const call = await restoredWith(app, entry({}));

  expect(call).toEqual(expect.arrayContaining([ChainNameEnum.mainChainName]));
  expect(call).not.toEqual(
    expect.arrayContaining(['https://testnet.example:443']),
  );
});

test('Tests that a wallet entry restores on its own network with the server it kept', async () => {
  const { app } = appWithSaved();

  const call = await restoredWith(
    app,
    entry({
      walletId: 'w1',
      name: 'Savings',
      chain: ChainNameEnum.testChainName,
      server: {
        kind: 'kept',
        server: {
          uri: 'https://kept.testnet:443',
          chainName: ChainNameEnum.testChainName,
        },
        selectServer: SelectServerEnum.custom,
      },
    }),
  );

  expect(call).toEqual(
    expect.arrayContaining([
      'https://kept.testnet:443',
      ChainNameEnum.testChainName,
    ]),
  );
});

test.each([
  ['a birthday of 0, as an empty field or an old saved entry gives', 0],
  ['a height below Sapling activation', 1000],
])(
  'Tests that the restore passes the height it was given to zingolib when it gets %s',
  async (_case, birthday) => {
    jest.useFakeTimers();
    try {
      const { app } = appWithSaved();
      jest.mocked(app.doRestore).mockRestore();
      jest.spyOn(app, 'setState').mockImplementation(() => {});
      const restore = jest.mocked(RPCModule.restoreWalletFromSeed);
      restore.mockRejectedValue(new Error('stop here'));

      await app.doRestore('abandon ability able', birthday);

      expect(restore.mock.calls[0][1]).toBe(String(birthday));
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  },
);
