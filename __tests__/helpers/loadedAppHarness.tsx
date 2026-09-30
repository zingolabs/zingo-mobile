/**
 * The mount harness the LoadedApp tests share. Each test file registers its
 * own jest.mock calls before it imports this module, so the container mounts
 * under that file's mocks.
 */

import React from 'react';
import NetInfo from '@react-native-community/netinfo/src/index';
import { act, render } from '@testing-library/react-native';
import { StackScreenProps } from '@react-navigation/stack';

import { LoadedApp, LoadedAppClass } from '@app/LoadedApp';
import { ChainNameEnum, LaunchingModeEnum, RouteEnum } from '@app/AppState';
import { AppStackParamList } from '@app/types';
import mockNavigation from '../../__mocks__/dataMocks/mockNavigation';

const { AppState, Linking } =
  jest.requireActual<typeof import('react-native')>('react-native');

export type DrawerProps = StackScreenProps<
  AppStackParamList,
  RouteEnum.LoadedApp
>;

export type LoadedAppParams = Partial<AppStackParamList[RouteEnum.LoadedApp]>;

export function makeDrawerProps(params: LoadedAppParams = {}): DrawerProps {
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
        ...params,
      },
    },
  } as DrawerProps;
}

export async function flushMicrotasks(times = 100): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

// Render, then drive the wrapper's async boot effect and the class
// componentDidMount to completion so the container commits.
export async function mountCommitted(params?: LoadedAppParams) {
  const utils = render(<LoadedApp {...makeDrawerProps(params)} />);
  await act(async () => {
    await flushMicrotasks();
  });
  const instance = utils.UNSAFE_root.findByType(LoadedAppClass)
    .instance as LoadedAppClass;
  return { utils, instance };
}

// The listener spies every LoadedApp mount needs. NetInfo hands back the
// given unsubscribe, and AppState and Linking hand back inert subscriptions.
export function spyOnLifecycleListeners(
  netInfoUnsubscribe: jest.Mock = jest.fn(),
): void {
  (NetInfo.addEventListener as jest.Mock).mockReturnValue(netInfoUnsubscribe);
  jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as never);
  jest
    .spyOn(Linking, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as never);
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
}
