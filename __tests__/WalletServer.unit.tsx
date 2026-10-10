import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import {
  ChainNameEnum,
  RouteEnum,
  SeedActionEnum,
  SelectServerEnum,
  TranslateType,
} from '@app/AppState';
import { remoteServer } from '@app/AppState/types/ServerType';
import WalletServer from '@screens/Server/WalletServer';
import { pickAutomatic } from '@app/services/serverPicking';

jest.mock('@app/walletBackend', () => ({ probeServer: jest.fn() }));
jest.mock('@app/services/serverPicking', () => ({
  otherServersFor: jest.fn().mockResolvedValue([]),
  pickAutomatic: jest.fn(),
  probeUri: jest.fn().mockResolvedValue({ latency: 40, height: '3473752' }),
  recommendedServers: jest.fn().mockReturnValue([]),
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
        selectServer: SelectServerEnum.list,
        walletChainName: ChainNameEnum.mainChainName,
        netInfo: { ...defaultAppContextLoaded.netInfo, isConnected: true },
      }}
    >
      <WalletServer
        navigation={navigation as never}
        route={{ key: 'server', name: RouteEnum.Server } as never}
        setServerOption={setServerOption}
      />
    </ContextAppLoadedProvider>,
  );
  return navigation;
};

test('Tests that Automatic on the wallet’s network reconnects the wallet and stays', async () => {
  (pickAutomatic as jest.Mock).mockResolvedValue({
    server: {
      uri: 'https://na.zec.rocks:443',
      chainName: ChainNameEnum.mainChainName,
    },
    tier: 'registry',
  });
  const setServerOption = jest.fn().mockResolvedValue({ kind: 'ok' });
  const navigation = mount(setServerOption);
  await act(async () => {
    fireEvent.press(screen.getByTestId('server.auto'));
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
  (pickAutomatic as jest.Mock).mockResolvedValue({
    server: {
      uri: 'https://testnet.zec.rocks:443',
      chainName: ChainNameEnum.testChainName,
    },
    tier: 'registry',
  });
  const setServerOption = jest
    .fn()
    .mockResolvedValue({ kind: 'chain-changed' });
  const navigation = mount(setServerOption);
  fireEvent.press(
    screen.getByTestId(`server.net.${ChainNameEnum.testChainName}`),
  );
  await act(async () => {
    fireEvent.press(screen.getByTestId('server.auto'));
  });
  expect(setServerOption).toHaveBeenCalledWith(
    remoteServer('https://testnet.zec.rocks:443', ChainNameEnum.testChainName),
    SelectServerEnum.auto,
    true,
    false,
  );
  expect(navigation.navigate).toHaveBeenCalledWith(RouteEnum.Seed, {
    action: SeedActionEnum.server,
  });
});
