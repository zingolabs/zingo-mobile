/**
 * @format
 *
 * Coarse container snapshot for LoadedApp. The committing
 * native-stack/bottom-tabs mocks make the container commit and drive the async
 * boot, so this snapshot is the committed container tree. The named invariants
 * live in LoadedApp.mountFence.test.tsx; this stays a coarse tripwire that later
 * changes rebaseline.
 */

jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('../app/walletBackend/utils/walletUtils', () => ({
  ...jest.requireActual('../app/walletBackend/utils/walletUtils'),
  doSave: jest.fn().mockResolvedValue(true),
}));

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

// The home tabs are leaf screens with their own snapshots; the container
// snapshot pins the navigator structure, not their internals.
jest.mock('../components/History', () => ({
  __esModule: true,
  default: 'MockHistoryScreen',
}));
jest.mock('../components/Send', () => ({
  __esModule: true,
  default: 'MockSendScreen',
}));
jest.mock('../components/Receive', () => ({
  __esModule: true,
  default: 'MockReceiveScreen',
}));

import 'react-native';
import React from 'react';

import { act, render } from '@testing-library/react-native';
import { LoadedApp } from '../app/LoadedApp';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../app/types';
import { ChainNameEnum, LaunchingModeEnum, RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): StackScreenProps<
  AppStackParamList,
  RouteEnum.LoadedApp
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.LoadedApp,
      params: {
        readOnly: false,
        orchardPool: true,
        saplingPool: true,
        transparentPool: true,
        newWallet: false,
        firstLaunchingMessage: LaunchingModeEnum.opening,
        walletChainName: ChainNameEnum.mainChainName,
      },
    },
  };
}

describe('Component LoadedApp - test', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('LoadedApp - snapshot', async () => {
    const toggleTheme = jest.fn();
    const props = makeDrawerProps();
    const loadedapp = render(<LoadedApp {...props} toggleTheme={toggleTheme} />);

    // Drive the wrapper's async boot (setLoading(false)) and componentDidMount so
    // the container commits.
    await act(async () => {
      for (let i = 0; i < 100; i++) {
        await Promise.resolve();
      }
    });

    expect(loadedapp.toJSON()).toMatchSnapshot();
  });
});
