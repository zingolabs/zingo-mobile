import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { usePreventRemove } from '@react-navigation/native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import {
  ChainNameEnum,
  Route,
  SelectServerEnum,
  TranslateType,
} from '@app/AppState';
import { remoteServer } from '@app/AppState/types/ServerType';
import WalletServer from '@screens/Server/WalletServer';
import { defaultServer } from '@app/services/serverPicking';
import SettingsFileImpl from '@app/services/SettingsFileImpl';

jest.mock('@app/walletBackend', () => ({ probeServer: jest.fn() }));
jest.mock('@app/services/SettingsFileImpl', () => ({
  __esModule: true,
  default: {
    serverOf: jest.fn(async () => ({
      server: {
        kind: 'remote',
        uri: 'https://other.zec:443',
        chainName: 'main',
      },
      selectServer: 'list',
    })),
    writeWalletServer: jest.fn(async () => true),
  },
}));
jest.mock('@app/services/serverPicking', () => ({
  otherServersFor: jest.fn().mockResolvedValue([]),
  defaultServer: jest.fn((_translate: unknown, chainName: string) => ({
    uri: 'https://zec.global:443',
    chainName,
  })),
  probeUri: jest.fn().mockResolvedValue({ latency: 40, height: '3473752' }),
  recommendedServers: jest.fn().mockReturnValue([]),
}));

const en = require('../app/translations/en.json');
const translate = (key: string): TranslateType =>
  key.split('.').reduce((o, k) => o?.[k], en) ?? key;

const mount = (setServerOption: jest.Mock, forWallet = '') => {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    addListener: jest.fn(() => () => {}),
    setOptions: jest.fn(),
  };
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate,
        server: remoteServer(
          'https://zec.global:443',
          ChainNameEnum.mainChainName,
        ),
        selectServer: SelectServerEnum.list,
        walletChainName: ChainNameEnum.mainChainName,
        netInfo: { ...defaultAppContextLoaded.netInfo, isConnected: true },
        setServerOption,
        walletId: 'w1',
        wallets: ['w1', 'w2'].map((id, i) => ({
          id,
          hasFile: true,
          meta: {
            v: 1,
            id,
            order: i + 1,
            createdAt: 0,
            name: `Wallet ${i + 1}`,
            chain: ChainNameEnum.mainChainName,
          },
        })),
      }}
    >
      <WalletServer
        navigation={navigation as never}
        route={
          {
            key: 'server',
            name: Route.Server,
            params: forWallet ? { walletId: forWallet } : undefined,
          } as never
        }
      />
    </ContextAppLoadedProvider>,
  );
  return navigation;
};

test('Tests that Automatic on the wallet’s network reconnects the wallet and stays', async () => {
  const setServerOption = jest.fn().mockResolvedValue({ kind: 'ok' });
  const navigation = mount(setServerOption);
  await act(async () => {
    fireEvent.press(screen.getByTestId('server.auto'));
  });
  expect(setServerOption).toHaveBeenCalledWith(
    remoteServer('https://zec.global:443', ChainNameEnum.mainChainName),
    SelectServerEnum.auto,
    true,
  );
  expect(navigation.navigate).not.toHaveBeenCalled();
});

test('Tests that the network stays the wallet’s when another network is tapped', async () => {
  const setServerOption = jest.fn().mockResolvedValue({ kind: 'ok' });
  const navigation = mount(setServerOption);
  fireEvent.press(
    screen.getByTestId(`server.net.${ChainNameEnum.testChainName}`),
  );
  await act(async () => {
    fireEvent.press(screen.getByTestId('server.auto'));
  });
  expect(defaultServer).toHaveBeenCalledWith(
    expect.anything(),
    ChainNameEnum.mainChainName,
  );
  expect(setServerOption).toHaveBeenCalledWith(
    remoteServer('https://zec.global:443', ChainNameEnum.mainChainName),
    SelectServerEnum.auto,
    true,
  );
  expect(navigation.navigate).not.toHaveBeenCalled();
});

test('Tests that nothing holds the back when nothing is unsaved, and the back arrow leaves', async () => {
  const preventRemove = usePreventRemove as jest.Mock;
  preventRemove.mockClear();
  const navigation = mount(jest.fn());
  const calls = preventRemove.mock.calls;
  expect(calls[calls.length - 1][0]).toBe(false);
  // Nothing held: iOS's native swipe stays on.
  expect(navigation.setOptions).toHaveBeenLastCalledWith({
    gestureEnabled: true,
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('server.back'));
  });
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
});

test('Tests that a server picked for another wallet is kept in its meta without reconnecting the open one', async () => {
  const setServerOption = jest.fn();
  mount(setServerOption, 'w2');
  await act(async () => {
    fireEvent.press(screen.getByTestId('server.auto'));
  });
  expect(SettingsFileImpl.writeWalletServer).toHaveBeenCalledWith(
    'w2',
    remoteServer('https://zec.global:443', ChainNameEnum.mainChainName),
    SelectServerEnum.auto,
  );
  expect(setServerOption).not.toHaveBeenCalled();
});
