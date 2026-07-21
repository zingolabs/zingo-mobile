/**
 * @format
 */

import 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoadedAppClass } from '../app/LoadedApp';
import {
  BlockExplorerEnum,
  ChainNameEnum,
  CurrencyEnum,
  GlobalConst,
  InfoType,
  LanguageEnum,
  ModeEnum,
  RouteEnum,
  SelectServerEnum,
  SettingsNameEnum,
  TotalBalanceClass,
} from '../app/AppState';
import { RPCPerformanceLevelEnum } from '../app/walletBackend/enums/RPCPerformanceLevelEnum';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: jest.fn().mockImplementation(supportedLocales => {
    return { languageTag: supportedLocales?.[0] || 'en', isRTL: false };
  }),
}));

jest.mock('i18n-js');

// The persisted "already onboarded" flag lives in the settings file; stub the
// file layer so the seen/not-seen paths are exercised without RNFS.
const mockReadSettings = jest.fn();
const mockWriteSettings = jest.fn();
jest.mock('../components/Settings/SettingsFileImpl', () => ({
  __esModule: true,
  default: {
    readSettings: (...args: unknown[]) => mockReadSettings(...args),
    writeSettings: (...args: unknown[]) => mockWriteSettings(...args),
  },
}));

// Whatever zingolib reports for mainnet; only the tip's position relative to
// it matters here.
const activation = 3_428_143;

// Puts the connected chain's tip at `latestBlock`. Every test needs this:
// without a tip past NU6.3 activation the trigger bails before it ever looks
// at the balance.
function setChainTip(instance: LoadedAppClass, latestBlock: number) {
  (instance as any).state = {
    ...(instance as any).state,
    info: {
      chainName: ChainNameEnum.mainChainName,
      latestBlock,
      ironwoodActivationHeight: activation,
    } as InfoType,
  };
}

function makeInstance(latestBlock: number = activation): LoadedAppClass {
  const props: any = {
    navigation: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.LoadedApp, params: {} },
    toggleTheme: jest.fn(),
    translate: jest.fn(() => ''),
    theme: { colors: {} },
    readOnly: false,
    orchardPool: true,
    saplingPool: true,
    transparentPool: true,
    newWallet: false,
    backgroundSyncInfo: {},
    addressBook: [],
    server: { uri: '', chainName: ChainNameEnum.mainChainName },
    currency: CurrencyEnum.noCurrency,
    language: LanguageEnum.en,
    sendAll: false,
    donation: false,
    privacy: false,
    mode: ModeEnum.advanced,
    security: {},
    selectServer: SelectServerEnum.auto,
    walletChainName: ChainNameEnum.mainChainName,
    rescanMenu: false,
    recoveryWalletInfoOnDevice: false,
    performanceLevel: RPCPerformanceLevelEnum.Medium,
    blockExplorer: BlockExplorerEnum.Zcashexplorer,
    nym: false,
    zenniesDonationAddress: '',
    firstLaunchingMessage: 'opening',
  };
  const instance = new LoadedAppClass(props);
  setChainTip(instance, latestBlock);
  return instance;
}

function makeBalance(confirmedOrchardBalance: number): TotalBalanceClass {
  return { confirmedOrchardBalance } as TotalBalanceClass;
}

describe('MeetIronwood auto-launch trigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // the app is in the foreground.
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(GlobalConst.no);
    // the wallet has not been through onboarding yet.
    mockReadSettings.mockResolvedValue({ ironwoodOnboardSeen: false });
    mockWriteSettings.mockResolvedValue(undefined);
  });

  test('navigates when the wallet has spendable non-dust orchard funds', async () => {
    const instance = makeInstance();
    const navigate = jest.fn();
    (instance as any).drawerNav = { navigate };

    await instance.checkMeetIronwood(makeBalance(0.001));

    expect(navigate).toHaveBeenCalledWith(RouteEnum.MeetIronwood);
  });

  test('does not navigate before NU6.3 activates on the chain', async () => {
    const instance = makeInstance(activation - 1);
    const navigate = jest.fn();
    (instance as any).drawerNav = { navigate };

    await instance.checkMeetIronwood(makeBalance(0.001));

    expect(navigate).not.toHaveBeenCalled();
  });

  test('does not navigate before the chain tip is known', async () => {
    // no info fetch yet (or the fetch failed, which zeroes latestBlock).
    const instance = makeInstance(0);
    const navigate = jest.fn();
    (instance as any).drawerNav = { navigate };

    await instance.checkMeetIronwood(makeBalance(0.001));

    expect(navigate).not.toHaveBeenCalled();
  });

  test('navigates once the chain crosses activation mid-session', async () => {
    const instance = makeInstance(activation - 1);
    const navigate = jest.fn();
    (instance as any).drawerNav = { navigate };

    await instance.checkMeetIronwood(makeBalance(0.001));
    expect(navigate).not.toHaveBeenCalled();

    // the fork lands while the wallet is running; the next sync tick sees it.
    setChainTip(instance, activation);
    await instance.checkMeetIronwood(makeBalance(0.001));

    expect(navigate).toHaveBeenCalledWith(RouteEnum.MeetIronwood);
  });

  test('does not navigate when the orchard balance is zero', async () => {
    const instance = makeInstance();
    const navigate = jest.fn();
    (instance as any).drawerNav = { navigate };

    await instance.checkMeetIronwood(makeBalance(0));

    expect(navigate).not.toHaveBeenCalled();
  });

  test('does not navigate before the first balance callback arrives', async () => {
    const instance = makeInstance();
    const navigate = jest.fn();
    (instance as any).drawerNav = { navigate };

    await instance.checkMeetIronwood(null);

    expect(navigate).not.toHaveBeenCalled();
  });

  test('does not navigate while the app is in the background', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(GlobalConst.yes);
    const instance = makeInstance();
    const navigate = jest.fn();
    (instance as any).drawerNav = { navigate };

    await instance.checkMeetIronwood(makeBalance(0.001));

    expect(navigate).not.toHaveBeenCalled();
  });

  test('retries when the inner navigator is not captured yet', async () => {
    const instance = makeInstance();

    // first balance callback arrives before the HomeStack effect ran.
    await instance.checkMeetIronwood(makeBalance(0.001));

    const navigate = jest.fn();
    (instance as any).drawerNav = { navigate };
    await instance.checkMeetIronwood(makeBalance(0.001));

    expect(navigate).toHaveBeenCalledWith(RouteEnum.MeetIronwood);
  });

  test('launches at most once per wallet-load session', async () => {
    const instance = makeInstance();
    const navigate = jest.fn();
    (instance as any).drawerNav = { navigate };

    await instance.checkMeetIronwood(makeBalance(0.001));
    await instance.checkMeetIronwood(makeBalance(0.001));

    expect(navigate).toHaveBeenCalledTimes(1);
  });

  test('does not navigate when onboarding was already seen', async () => {
    mockReadSettings.mockResolvedValue({ ironwoodOnboardSeen: true });
    const instance = makeInstance();
    const navigate = jest.fn();
    (instance as any).drawerNav = { navigate };

    await instance.checkMeetIronwood(makeBalance(0.001));

    expect(navigate).not.toHaveBeenCalled();
  });

  test('persists the seen flag when it launches', async () => {
    const instance = makeInstance();
    (instance as any).drawerNav = { navigate: jest.fn() };

    await instance.checkMeetIronwood(makeBalance(0.001));

    expect(mockWriteSettings).toHaveBeenCalledWith(
      SettingsNameEnum.ironwoodOnboardSeen,
      true,
    );
  });
});
