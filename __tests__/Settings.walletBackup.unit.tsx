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
import { RouteEnum, SelectServerEnum } from '@app/AppState';
import {
  ConfirmOptions,
  registerConfirmListener,
} from '@app/services/showConfirm';
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
  registerConfirmListener(null);
});

const onRestoreWalletBackup = jest.fn(async () => {});

const renderSettings = async () => {
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
      }}
    >
      <Settings
        {...props}
        setLanguageOption={jest.fn()}
        setBiometricsOption={jest.fn()}
        setPerformanceLevelOption={jest.fn()}
        setBlockExplorerOption={jest.fn()}
        toggleMenuDrawer={jest.fn()}
        onRestoreWalletBackup={onRestoreWalletBackup}
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
  await renderSettings();
  expect(screen.queryByTestId('settings.restorebackupwallet')).toBeNull();
});

test('Tests that the developer options swap the wallet backup in after a confirm when a backup exists.', async () => {
  nativeRpc.walletBackupExists.mockResolvedValue('true');
  const confirms: ConfirmOptions[] = [];
  registerConfirmListener(options => confirms.push(options));
  await renderSettings();

  fireEvent.press(await screen.findByTestId('settings.restorebackupwallet'));

  expect(confirms).toHaveLength(1);
  expect(confirms[0].message).toBe('settings.restorebackup-warning');
  expect(onRestoreWalletBackup).not.toHaveBeenCalled();
  confirms[0].buttons[0].onPress?.();
  expect(onRestoreWalletBackup).toHaveBeenCalledTimes(1);
});
