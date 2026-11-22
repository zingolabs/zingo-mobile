import 'react-native';
import React from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Settings from '@screens/Settings';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { Route, SelectServerEnum } from '@app/AppState';
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

const mockAuthorize = jest.fn(async () => true);
jest.mock('@app/hooks/useAuthorize', () => ({
  useAuthorize: () => mockAuthorize,
}));

const setBiometricsOption = jest.fn(async () => {});
const setPrivacyOption = jest.fn(async () => {});

afterEach(() => {
  jest.clearAllMocks();
});

const renderSettings = async () => {
  mockNavigation.canGoBack.mockReturnValue(true);
  const props: any = {
    navigation: mockNavigation,
    route: { key: 'Key-1', name: Route.Settings, params: undefined },
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
        biometrics: true,
        setBiometricsOption,
        setPrivacyOption,
      }}
    >
      <Settings {...props} />
    </ContextAppLoadedProvider>,
  );
  await screen.findByTestId('settings.securitytitle');
};

const save = async () => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('settings.button.save'));
    /** The button saves a beat after the press, once the keyboard is down. */
    await new Promise(resolve => setTimeout(resolve, 150));
  });
};

test('Tests that Settings opens without asking for the device lock when the switch is on.', async () => {
  await renderSettings();

  expect(mockAuthorize).not.toHaveBeenCalled();
});

test('Tests that the switch stays on and nothing is saved when the device lock is declined at the save that turns it off.', async () => {
  mockAuthorize.mockResolvedValueOnce(false);
  await renderSettings();
  await act(async () => {
    fireEvent.press(screen.getByTestId('settings.biometrics'));
  });

  await save();

  expect(mockAuthorize).toHaveBeenCalledTimes(1);
  expect(setBiometricsOption).not.toHaveBeenCalled();
});

test('Tests that the switch turns off when the device lock passes at the save.', async () => {
  await renderSettings();
  await act(async () => {
    fireEvent.press(screen.getByTestId('settings.biometrics'));
  });

  await save();

  expect(mockAuthorize).toHaveBeenCalledTimes(1);
  expect(setBiometricsOption).toHaveBeenCalledWith(false);
});
