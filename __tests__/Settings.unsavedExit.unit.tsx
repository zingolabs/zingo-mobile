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

const guard = usePreventRemove as jest.Mock;

// The action react-navigation held back; the screen dispatches this one
// once the user has agreed to leave.
const BACK: NavigationAction = { type: 'GO_BACK' };

const setBiometricsOption = jest.fn(async () => {});

afterEach(() => {
  jest.clearAllMocks();
  registerConfirmListener(null);
});

/** What the guard was told on the screen's latest render. */
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

/** Turns the security switch on, which is an edit the Save button persists. */
const editASetting = async () => {
  await act(async () => {
    fireEvent.press(screen.getByTestId('settings.biometrics'));
  });
};

test('Tests that a screen with nothing edited is not guarded, so leaving asks nothing.', async () => {
  await renderSettings();

  expect(guardState().preventRemove).toBe(false);
});

test('Tests that an unsaved edit guards the screen and leaving asks what to do with it.', async () => {
  const confirms: ConfirmOptions[] = [];
  registerConfirmListener(options => confirms.push(options));
  await renderSettings();
  await editASetting();

  expect(guardState().preventRemove).toBe(true);

  act(() => {
    guardState().onPrevented({ data: { action: BACK } });
  });

  expect(confirms).toHaveLength(1);
  expect(confirms[0].title).toBe('settings.unsaved-title');
  expect(confirms[0].buttons.map(b => b.text)).toEqual([
    'settings.unsaved-save',
    'settings.unsaved-discard',
    'cancel',
  ]);
  // Still on the screen: the question alone changes nothing.
  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  expect(setBiometricsOption).not.toHaveBeenCalled();
});

test('Tests that staying keeps the screen and its edit.', async () => {
  const confirms: ConfirmOptions[] = [];
  registerConfirmListener(options => confirms.push(options));
  await renderSettings();
  await editASetting();
  act(() => {
    guardState().onPrevented({ data: { action: BACK } });
  });

  await act(async () => {
    confirms[0].buttons[2].onPress?.();
  });

  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  expect(setBiometricsOption).not.toHaveBeenCalled();
  // The guard is still up, so the next attempt asks again.
  expect(guardState().preventRemove).toBe(true);
});

test('Tests that discarding leaves without saving, and the guard is down so the exit goes through.', async () => {
  const confirms: ConfirmOptions[] = [];
  registerConfirmListener(options => confirms.push(options));
  await renderSettings();
  await editASetting();
  act(() => {
    guardState().onPrevented({ data: { action: BACK } });
  });

  await act(async () => {
    confirms[0].buttons[1].onPress?.();
  });

  expect(setBiometricsOption).not.toHaveBeenCalled();
  expect(mockNavigation.dispatch).toHaveBeenCalledWith(BACK);
  expect(guardState().preventRemove).toBe(false);
});

test('Tests that saving from the question persists the edit and then leaves.', async () => {
  const confirms: ConfirmOptions[] = [];
  registerConfirmListener(options => confirms.push(options));
  await renderSettings();
  await editASetting();
  act(() => {
    guardState().onPrevented({ data: { action: BACK } });
  });

  await act(async () => {
    confirms[0].buttons[0].onPress?.();
  });

  expect(setBiometricsOption).toHaveBeenCalledWith(true);
  expect(mockNavigation.dispatch).toHaveBeenCalledWith(BACK);
  expect(guardState().preventRemove).toBe(false);
});
