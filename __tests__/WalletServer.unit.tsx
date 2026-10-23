import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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
import { pickAutomatic } from '@app/services/serverPicking';

jest.mock('@app/walletBackend', () => ({ probeServer: jest.fn() }));
jest.mock('@app/services/serverPicking', () => ({
  pickAutomatic: jest.fn(),
  probeUri: jest.fn().mockResolvedValue({ latency: 40, height: '3473752' }),
}));
jest.mock('@app/uris/defaultIndexer', () => ({
  loadDefaultIndexer: jest.fn(async (chain: string) =>
    chain === 'main'
      ? 'https://na.zec.rocks:443'
      : 'https://testnet.zec.rocks:443',
  ),
  defaultIndexer: jest.fn(() => null),
}));

const en = require('../app/translations/en.json');
const translate = (key: string): TranslateType =>
  key.split('.').reduce((o, k) => o?.[k], en) ?? key;

const mount = (setServerOption: jest.Mock) => {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    addListener: jest.fn(() => () => {}),
  };
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate,
        server: remoteServer(
          'https://zec.rocks:443',
          ChainNameEnum.mainChainName,
        ),
        selectServer: SelectServerEnum.custom,
        walletChainName: ChainNameEnum.mainChainName,
        netInfo: { ...defaultAppContextLoaded.netInfo, isConnected: true },
        setServerOption,
      }}
    >
      <WalletServer
        navigation={navigation as never}
        route={{ key: 'server', name: Route.Server } as never}
      />
    </ContextAppLoadedProvider>,
  );
  return navigation;
};

test('Tests that Automatic on the wallet’s network reconnects the wallet and stays', async () => {
  (pickAutomatic as jest.Mock).mockResolvedValue(
    remoteServer('https://na.zec.rocks:443', ChainNameEnum.mainChainName),
  );
  const setServerOption = jest.fn().mockResolvedValue({ kind: 'ok' });
  const navigation = mount(setServerOption);
  const auto = await screen.findByTestId('server.auto');
  await act(async () => {
    fireEvent.press(auto);
  });
  expect(setServerOption).toHaveBeenCalledWith(
    remoteServer('https://na.zec.rocks:443', ChainNameEnum.mainChainName),
    SelectServerEnum.auto,
    true,
    true,
  );
  expect(navigation.navigate).not.toHaveBeenCalled();
});

test('Tests that a server on another network goes to the recovery screen', async () => {
  (pickAutomatic as jest.Mock).mockResolvedValue(
    remoteServer('https://testnet.zec.rocks:443', ChainNameEnum.testChainName),
  );
  const setServerOption = jest
    .fn()
    .mockResolvedValue({ kind: 'chain-changed' });
  const navigation = mount(setServerOption);
  fireEvent.press(
    screen.getByTestId(`server.net.${ChainNameEnum.testChainName}`),
  );
  const auto = await screen.findByTestId('server.auto');
  await act(async () => {
    fireEvent.press(auto);
  });
  expect(setServerOption).toHaveBeenCalledWith(
    remoteServer('https://testnet.zec.rocks:443', ChainNameEnum.testChainName),
    SelectServerEnum.auto,
    true,
    false,
  );
  expect(navigation.navigate).toHaveBeenCalledWith(Route.WalletSeed, {
    action: 'server',
  });
});
