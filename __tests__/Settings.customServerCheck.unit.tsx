import 'react-native';
import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import Settings from '@screens/Settings';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import {
  ChainNameEnum,
  RouteEnum,
  SelectServerEnum,
  remoteServer,
} from '@app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const mockedLatestBlock = jest.fn();

jest.mock('@app/uris/fetchServerList', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue([]),
}));
jest.mock('@app/walletBackend', () => ({
  ...jest.requireActual('@app/walletBackend'),
  getLatestBlockServerInfo: (...args: unknown[]) => mockedLatestBlock(...args),
}));

const renderCustom = () => {
  const props: any = {
    navigation: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.Settings, params: undefined },
  };
  return render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: (key: string) => key,
        info: mockInfo,
        totalBalance: mockTotalBalance,
        server: remoteServer(
          'https://custom.example:443',
          ChainNameEnum.mainChainName,
        ),
        selectServer: SelectServerEnum.custom,
      }}
    >
      <Settings
        {...props}
        setServerOption={jest.fn()}
        setSelectServerOption={jest.fn()}
        setCurrencyOption={jest.fn()}
        setLanguageOption={jest.fn()}
        setSendAllOption={jest.fn()}
        setDonationOption={jest.fn()}
        setPrivacyOption={jest.fn()}
        setModeOption={jest.fn()}
        setBiometricsOption={jest.fn()}
        setSelectServerOptionCustom={jest.fn()}
        closeScreen={jest.fn()}
      />
    </ContextAppLoadedProvider>,
  );
};

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

test('Tests that typing a custom server checks nothing until Check is pressed, and a failed check shows its reason', async () => {
  jest.useFakeTimers();
  mockedLatestBlock.mockResolvedValue({
    ok: false,
    error: {
      code: 'Indexer',
      message: 'transport error: dns error: no such host',
    },
  });
  renderCustom();
  const field = await screen.findByTestId('settings.custom-server-field');

  fireEvent.changeText(field, 'https://mainnet.zainod.zingolabs.dev:443');
  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(mockedLatestBlock).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.press(screen.getByTestId('settings.custom-server-check'));
  });
  await waitFor(() =>
    expect(
      screen.getByTestId('settings.custom-server-failure').props.children,
    ).toBe('transport error: dns error: no such host'),
  );
  expect(mockedLatestBlock).toHaveBeenCalledWith(
    'https://mainnet.zainod.zingolabs.dev:443',
  );

  fireEvent.changeText(field, 'https://mainnet.zainod.zingolabs.dev');
  expect(screen.queryByTestId('settings.custom-server-failure')).toBeNull();
});

test('Tests that a URI the parser refuses shows the parser reason when checked', async () => {
  renderCustom();
  const field = await screen.findByTestId('settings.custom-server-field');
  fireEvent.changeText(field, 'http://plain.example:9067');
  await act(async () => {
    fireEvent.press(screen.getByTestId('settings.custom-server-check'));
  });
  expect(
    screen.getByTestId('settings.custom-server-failure').props.children,
  ).toBe('uris.error-http-not-allowed');
  expect(mockedLatestBlock).not.toHaveBeenCalled();
});
