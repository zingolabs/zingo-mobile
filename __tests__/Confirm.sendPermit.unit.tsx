// The shared mock of the bottom sheet drops the footer. The confirm button
// is in the footer, and this mock renders it below the sheet's children.
jest.mock('@gorhom/bottom-sheet', () => {
  const actual = jest.requireActual('../__mocks__/@gorhom/bottom-sheet');
  const { Fragment, createElement } = require('react');
  return {
    ...actual,
    __esModule: true,
    default: ({
      children,
      footerComponent,
    }: {
      children: unknown;
      footerComponent: (props: object) => unknown;
    }) => createElement(Fragment, {}, children, footerComponent({})),
  };
});

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import Confirm from '@screens/Confirm';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { RouteEnum } from '@app/AppState';
import type { TranslateType } from '@app/AppState';
import { AppDrawerParamList } from '@app/types';
import { SendPermitInputs } from '@app/walletBackend/transforms/sendPermit';
import { mixnetLost, mixnetReady } from '../.storybook/storyMocks';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';
import mockSendPageState from '../__mocks__/dataMocks/mockSendPageState';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';

const translate = (key: string): TranslateType => key;

const online: SendPermitInputs = {
  netInfo: {
    isConnected: true,
    type: NetInfoStateType.wifi,
    isConnectionExpensive: false,
  },
  server: mockServer,
  mixnetView: mixnetReady,
};

function makeProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Confirm
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Confirm,
      params: {
        calculatedFee: 0.00001,
        proposalPools: { source: ['ironwood'], destination: ['ironwood'] },
        confirmSend: jest.fn(async () => {}),
        sendAllAmount: false,
        calculateFeeWithPropose: jest.fn(async () => {}),
        sendPageState: mockSendPageState,
      },
    },
  };
}

const confirmUi = (inputs: SendPermitInputs) => {
  const state = { ...defaultAppContextLoaded };
  state.translate = translate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.zecPrice = mockZecPrice;
  state.biometrics = false;
  state.server = inputs.server;
  state.netInfo = inputs.netInfo;
  state.mixnetView = inputs.mixnetView;
  return (
    <ContextAppLoadedProvider value={state}>
      <Confirm {...makeProps()} />
    </ContextAppLoadedProvider>
  );
};

describe('Confirm send permit', () => {
  test('Tests that the confirm button is enabled when the permit is granted.', () => {
    const { getByTestId, queryByTestId } = render(confirmUi(online));

    expect(getByTestId('send.confirm.button')).toBeEnabled();
    expect(queryByTestId('send.confirm.refusal')).toBeNull();
  });

  test('Tests that the confirm button is disabled and the mixnet reason is shown when the transport dies while the Confirm screen is open.', () => {
    const view = render(confirmUi(online));

    view.rerender(confirmUi({ ...online, mixnetView: mixnetLost }));

    expect(view.getByTestId('send.confirm.button')).toBeDisabled();
    expect(view.getByTestId('send.confirm.refusal')).toHaveTextContent(
      /send\.nym-blocked/,
    );
  });

  test('Tests that the confirm button is disabled and the connection reason is shown when the device disconnects while the Confirm screen is open.', () => {
    const view = render(confirmUi(online));

    view.rerender(
      confirmUi({
        ...online,
        netInfo: { ...online.netInfo, isConnected: false },
      }),
    );

    expect(view.getByTestId('send.confirm.button')).toBeDisabled();
    expect(view.getByTestId('send.confirm.refusal')).toHaveTextContent(
      /loadedapp\.connection-error/,
    );
  });
});
