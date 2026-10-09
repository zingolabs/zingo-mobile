import 'react-native';
import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import RPCModule from '@app/RPCModule';
import Settings from '@screens/Settings';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { RouteEnum, SelectServerEnum, UfvkActionEnum } from '@app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () => {
  const members: Record<PropertyKey, jest.Mock> = {};
  return {
    __esModule: true,
    default: new Proxy(members, {
      get: (target, prop) => (target[prop] ??= jest.fn()),
    }),
  };
});

const nativeRpc = RPCModule as unknown as Record<string, jest.Mock>;

afterEach(() => {
  jest.clearAllMocks();
});

const renderSettings = async (readOnly: boolean) => {
  const props: any = {
    navigation: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.Settings, params: undefined },
  };
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: (key: string) => key,
        info: mockInfo,
        totalBalance: mockTotalBalance,
        server: mockServer,
        selectServer: SelectServerEnum.auto,
        readOnly,
      }}
    >
      <Settings
        {...props}
        setLanguageOption={jest.fn()}
        setBiometricsOption={jest.fn()}
        setPerformanceLevelOption={jest.fn()}
        setBlockExplorerOption={jest.fn()}
        toggleMenuDrawer={jest.fn()}
      />
    </ContextAppLoadedProvider>,
  );
  const title = await screen.findByText('settings.privacy-title');
  await act(async () => {
    fireEvent(title, 'longPress');
  });
};

test('Tests that the developer options offer no backup restore when there is no wallet backup.', async () => {
  nativeRpc.walletBackupExists.mockResolvedValue('false');
  await renderSettings(false);
  expect(screen.queryByTestId('settings.restorebackupwallet')).toBeNull();
});

test.each([
  [false, RouteEnum.WalletSeed, { action: 'backup' }],
  [true, RouteEnum.Ufvk, { action: UfvkActionEnum.backup }],
])(
  'Tests that the developer options open the backup restore when a wallet backup exists (read only: %s).',
  async (readOnly, route, params) => {
    nativeRpc.walletBackupExists.mockResolvedValue('true');
    await renderSettings(readOnly);
    fireEvent.press(await screen.findByTestId('settings.restorebackupwallet'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith(route, params);
  },
);
