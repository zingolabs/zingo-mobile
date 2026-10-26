// The shared mock of the bottom sheet drops the footer. The Done and View
// transaction buttons are in the footer, and this mock renders it below the
// sheet's children; while sending there is no footer.
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
      footerComponent?: (props: object) => unknown;
    }) => createElement(Fragment, {}, children, footerComponent?.({})),
  };
});

import 'react-native';
import React from 'react';

import { act, fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import ComputingTxContent from '@screens/Computing/ComputingTxContent';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { Route, ValueTransferType } from '@app/AppState';
import type { TranslateType } from '@app/AppState';
import type { ComputingParams } from '@app/walletBackend/transforms/sendSettlement';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const translate = (key: string): TranslateType => key;
const subject = { amount: '0.5000', who: 'Irene' };

const computing = (
  params: ComputingParams | undefined,
  valueTransfers: ValueTransferType[] = [],
) =>
  render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate, valueTransfers }}
    >
      <ComputingTxContent
        navigation={mockNavigation}
        route={{ key: 'Key-1', name: Route.Computing, params }}
      />
    </ContextAppLoadedProvider>,
  );

beforeEach(() => {
  jest.useFakeTimers();
  (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  (mockNavigation.navigate as jest.Mock).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Computing flight', () => {
  test('Tests that the steps are told one by one and the last one stays when the send takes long', () => {
    const view = computing({ subject });
    expect(
      view.getByTestId('computing.flight', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.step-build',
    );
    expect(view.getByText('send.sending-line')).toBeTruthy();
    act(() => jest.advanceTimersByTime(1300));
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.step-proof',
    );
    act(() => jest.advanceTimersByTime(10_000));
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.step-nym',
    );
  });

  test('Tests that a send that went out says Sent with how much and to whom when it settles', () => {
    const view = computing({ phase: 'created', subject });
    expect(view.getByTestId('computing.sent')).toBeTruthy();
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.sent-title',
    );
    expect(view.getByText('send.sent-line')).toBeTruthy();
    fireEvent.press(view.getByTestId('computing.done'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith(Route.Home, {
      screen: Route.History,
    });
  });

  test('Tests that View transaction opens the new transaction when History already lists it', () => {
    const vt = { txid: 'abc' } as ValueTransferType;
    const view = computing({ phase: 'created', txid: 'abc', subject }, [vt]);
    fireEvent.press(view.getByTestId('computing.view'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Route.ValueTransferDetail,
      expect.objectContaining({ vt }),
    );
  });

  test('Tests that a shield, with nothing to name, keeps the created words when it settles', () => {
    const view = computing({ phase: 'created' });
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'loadedapp.transactioncreated-title',
    );
  });
});
