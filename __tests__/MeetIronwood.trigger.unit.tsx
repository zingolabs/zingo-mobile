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
  LanguageEnum,
  ModeEnum,
  RouteEnum,
  SelectServerEnum,
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

function makeInstance(): LoadedAppClass {
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
  return new LoadedAppClass(props);
}

function makeBalance(confirmedOrchardBalance: number): TotalBalanceClass {
  return { confirmedOrchardBalance } as TotalBalanceClass;
}

describe('MeetIronwood auto-launch trigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // the app is in the foreground.
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(GlobalConst.no);
  });

  test('navigates when the wallet has spendable non-dust orchard funds', async () => {
    const instance = makeInstance();
    const navigate = jest.fn();
    (instance as any).drawerNav = { navigate };

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
});
