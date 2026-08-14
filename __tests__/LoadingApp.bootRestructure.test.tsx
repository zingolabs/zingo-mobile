/**
 * The LoadingApp boot restructure, pinned at the committing mount.
 *
 * LoadingApp mounts and commits under the current nav mocks, so the boot
 * restructure is pinned against the real instance. Two pins, both pre-change red:
 *
 * - #2 listener leak: a hand-call restart (openCurrentWallet) re-ran the whole
 *   componentDidMount, re-registering AppState/NetInfo without removing the prior
 *   handle. Green once subscribe() owns the listeners once per mount and the
 *   restart routes through runBoot().
 * - #3 unmount guard: a reset unmounts LoadingApp mid-boot, the in-flight await
 *   resolves, and setState writes to a dead instance. Green once every boot
 *   continuation drops its setState when the boot-generation moved or the
 *   component unmounted.
 *
 * The happy path is behavior-preserving, so LoadingApp.snapshot stays green.
 */

jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

// The boot chain reaches these through the ../walletBackend barrel; mock them at
// their source module so the barrel's live binding resolves to the stub (the
// doSave mock pattern). Stubbed to the short no-wallet path: nothing exists.
jest.mock('../app/walletBackend/utils/walletUtils', () => ({
  ...jest.requireActual('../app/walletBackend/utils/walletUtils'),
  doSave: jest.fn().mockResolvedValue(true),
  setCryptoDefaultProvider: jest.fn().mockResolvedValue(true),
  walletBackupExists: jest.fn().mockResolvedValue(false),
  walletExists: jest.fn().mockResolvedValue(false),
  getVersionInfo: jest.fn().mockResolvedValue({ ok: true, value: 'test' }),
}));

jest.mock('../app/recoveryWalletInfo', () => ({
  __esModule: true,
  hasRecoveryWalletInfo: jest.fn().mockResolvedValue(false),
  createUpdateRecoveryWalletInfo: jest.fn().mockResolvedValue(undefined),
  getRecoveryWalletInfo: jest.fn().mockResolvedValue(undefined),
  removeRecoveryWalletInfo: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: jest.fn().mockImplementation(supportedLocales => ({
    languageTag: supportedLocales?.[0] || 'en',
    isRTL: false,
  })),
}));

jest.mock('i18n-js');

// LoadingApp renders <Toast/>; the shared mock exposes only the show/hide
// statics, so give it a renderable component that keeps them.
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: Object.assign(() => null, { show: jest.fn(), hide: jest.fn() }),
}));

jest.mock('../app/simpleBiometrics', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
  getLastGateFailure: jest.fn(),
}));

// The manual react-native mock registers the real module for later importers,
// so the source's AppState.currentState resolves. Precedent: LoadingApp.snapshot.
import 'react-native';
import React from 'react';
import NetInfo from '@react-native-community/netinfo/src/index';
import { act, render } from '@testing-library/react-native';

const { AppState } =
  jest.requireActual<typeof import('react-native')>('react-native');

import { LoadingAppClass } from '../app/LoadingApp';
import {
  BackgroundType,
  BlockExplorerEnum,
  ChainNameEnum,
  CurrencyEnum,
  LanguageEnum,
  LaunchingModeEnum,
  ModeEnum,
  RouteEnum,
  SecurityType,
  SelectServerEnum,
} from '../app/AppState';
import { RPCPerformanceLevelEnum } from '../app/walletBackend/enums/RPCPerformanceLevelEnum';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const netInfoUnsubscribe = jest.fn();

async function flushMicrotasks(times = 100): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

const noSecurity: SecurityType = {
  startApp: false,
  foregroundApp: false,
  sendConfirm: false,
  seedUfvkScreen: false,
  rescanScreen: false,
  settingsScreen: false,
  changeWalletScreen: false,
  restoreWalletBackupScreen: false,
};

function makeProps(): React.ComponentProps<typeof LoadingAppClass> {
  return {
    navigationApp: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.LoadingApp, params: undefined },
    toggleTheme: jest.fn(),
    translate: mockTranslate,
    theme: mockTheme,
    language: LanguageEnum.en,
    currency: CurrencyEnum.USDCurrency,
    server: { uri: '', chainName: ChainNameEnum.mainChainName },
    sendAll: false,
    donation: false,
    privacy: false,
    mode: ModeEnum.advanced,
    backgroundSyncInfo: {} as BackgroundType,
    firstLaunchingMessage: LaunchingModeEnum.opening,
    security: noSecurity,
    selectServer: SelectServerEnum.offline,
    donationAlert: false,
    rescanMenu: false,
    recoveryWalletInfoOnDevice: false,
    performanceLevel: RPCPerformanceLevelEnum.Medium,
    blockExplorer: BlockExplorerEnum.Zcashexplorer,
    // mockTheme / mockTranslate stand in for AppTheme / TranslateType, which do
    // not structurally overlap, so the fabricated props route through unknown.
  } as unknown as React.ComponentProps<typeof LoadingAppClass>;
}

function instanceOf(
  utils: ReturnType<typeof render>,
): InstanceType<typeof LoadingAppClass> {
  return utils.UNSAFE_root.findByType(LoadingAppClass)
    .instance as InstanceType<typeof LoadingAppClass>;
}

describe('LoadingApp boot restructure — current boot behavior', () => {
  let appStateSubscription: { remove: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      details: { isConnectionExpensive: false },
    });
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(netInfoUnsubscribe);
    appStateSubscription = { remove: jest.fn() };
    jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue(appStateSubscription as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('#2: a hand-call restart does not re-register the AppState/NetInfo listeners', async () => {
    const utils = render(<LoadingAppClass {...makeProps()} />);
    await act(async () => {
      await flushMicrotasks();
    });

    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);

    const instance = instanceOf(utils);
    await act(async () => {
      instance.openCurrentWallet();
      await flushMicrotasks();
    });

    // The restart re-ran the boot chain but must not re-subscribe: the prior
    // handles are still the only ones, so nothing leaked.
    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('#3: unmounting mid-boot drops the continuation, no setState on the dead instance', async () => {
    const gate = deferred<{ isConnected: boolean; type: string }>();
    (NetInfo.fetch as jest.Mock).mockReturnValue(gate.promise);

    const utils = render(<LoadingAppClass {...makeProps()} />);

    const instance = instanceOf(utils);
    const setStateSpy = jest.spyOn(instance, 'setState');

    act(() => {
      utils.unmount();
    });

    gate.resolve({ isConnected: true, type: 'wifi' });
    await act(async () => {
      await flushMicrotasks();
    });

    expect(setStateSpy).not.toHaveBeenCalled();
  });
});
