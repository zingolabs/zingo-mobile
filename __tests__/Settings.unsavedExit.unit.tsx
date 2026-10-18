import 'react-native';
import React from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { usePreventRemove } from '@react-navigation/native';
import type { NavigationAction } from '@react-navigation/native';
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

const guard = usePreventRemove as jest.Mock;

const BACK: NavigationAction = { type: 'GO_BACK' };

const setBiometricsOption = jest.fn(async () => {});

afterEach(() => {
  jest.clearAllMocks();
});

const guardState = (): {
  preventRemove: boolean;
  onPrevented: (options: { data: { action: NavigationAction } }) => void;
} => {
  const call = guard.mock.calls.at(-1);
  if (!call) {
    throw new Error('Settings never called usePreventRemove');
  }
  return { preventRemove: call[0], onPrevented: call[1] };
};

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
        setBiometricsOption,
      }}
    >
      <Settings {...props} />
    </ContextAppLoadedProvider>,
  );
  await screen.findByTestId('settings.securitytitle');
};

const editASetting = async () => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('settings.biometrics'));
  });
};

const tryToLeave = () => {
  act(() => {
    guardState().onPrevented({ data: { action: BACK } });
  });
};

test('Tests that leaving goes unguarded when nothing is edited.', async () => {
  await renderSettings();

  expect(guardState().preventRemove).toBe(false);
});

test('Tests that the save sheet names the edit when the user leaves with one unsaved edit.', async () => {
  await renderSettings();
  await editASetting();

  expect(guardState().preventRemove).toBe(true);

  tryToLeave();

  expect(screen.getByTestId('settings.unsaved')).toBeOnTheScreen();
  expect(screen.getByText('settings.unsaved-title')).toBeOnTheScreen();
  expect(
    screen.getByText('settings.unsaved-one settings.unsaved-keeps'),
  ).toBeOnTheScreen();
  expect(screen.getByText('server.save')).toBeOnTheScreen();
  expect(screen.getByText('server.dont-save')).toBeOnTheScreen();
  expect(screen.getByText('server.keep-editing')).toBeOnTheScreen();
  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  expect(setBiometricsOption).not.toHaveBeenCalled();
});

test('Tests that the screen and its edit remain when the user keeps editing.', async () => {
  await renderSettings();
  await editASetting();
  tryToLeave();

  await act(async () => {
    fireEvent.press(screen.getByTestId('settings.unsaved.keep'));
  });

  expect(screen.queryByTestId('settings.unsaved')).not.toBeOnTheScreen();
  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  expect(setBiometricsOption).not.toHaveBeenCalled();
  expect(guardState().preventRemove).toBe(true);
});

test('Tests that a second back closes the sheet when the sheet is up.', async () => {
  await renderSettings();
  await editASetting();
  tryToLeave();
  tryToLeave();

  expect(screen.queryByTestId('settings.unsaved')).not.toBeOnTheScreen();
  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
});

test('Tests that the held exit goes through unsaved when the user picks Don’t Save.', async () => {
  await renderSettings();
  await editASetting();
  tryToLeave();

  await act(async () => {
    fireEvent.press(screen.getByTestId('settings.unsaved.discard'));
  });

  expect(setBiometricsOption).not.toHaveBeenCalled();
  expect(mockNavigation.dispatch).toHaveBeenCalledWith(BACK);
  expect(guardState().preventRemove).toBe(false);
});

test('Tests that the edit persists before the held exit goes through when the user picks Save.', async () => {
  await renderSettings();
  await editASetting();
  tryToLeave();

  await act(async () => {
    fireEvent.press(screen.getByTestId('settings.unsaved.save'));
  });

  expect(setBiometricsOption).toHaveBeenCalledWith(true);
  expect(mockNavigation.dispatch).toHaveBeenCalledWith(BACK);
  expect(guardState().preventRemove).toBe(false);
});

test('Tests that the screen remains open when the save fails.', async () => {
  setBiometricsOption.mockRejectedValueOnce(new Error('declined'));
  await renderSettings();
  await editASetting();
  tryToLeave();

  await act(async () => {
    fireEvent.press(screen.getByTestId('settings.unsaved.save'));
  });

  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  expect(guardState().preventRemove).toBe(true);
});
