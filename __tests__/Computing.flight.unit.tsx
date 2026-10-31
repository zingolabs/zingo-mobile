// The shared mock of the bottom sheet drops the footer. The buttons are in
// the footer, and this mock renders it below the sheet's children.
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
import { ValueTransferKindEnum } from '@app/AppState/enums/ValueTransferKindEnum';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import type {
  ComputingParams,
  ComputingSubject,
} from '@app/walletBackend/transforms/sendSettlement';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const translate = (key: string): TranslateType => key;
const subject: ComputingSubject = {
  amount: '0.5000',
  who: 'Irene',
  kind: 'send',
  pair: false,
};
const SINCE = 1_700_000_000;

const row = (
  txid: string,
  status: RPCValueTransfersStatusEnum,
  confirmations = 0,
  kind = ValueTransferKindEnum.Sent,
): ValueTransferType =>
  ({
    txid,
    kind,
    status,
    confirmations,
    time: SINCE + 1,
    amount: 0.5,
    blockheight: 0,
  }) as ValueTransferType;

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

const hidden = { includeHiddenElements: true };

beforeEach(() => {
  jest.useFakeTimers();
  (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  (mockNavigation.navigate as jest.Mock).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Computing flight', () => {
  test('Tests that Creating turns into Through NYM on its clock when the backend takes long', () => {
    const view = computing({ subject });
    expect(view.getByTestId('computing.flight.build', hidden)).toBeTruthy();
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.step-build',
    );
    expect(view.getByText('send.sending-line')).toBeTruthy();
    expect(view.queryByTestId('computing.view')).toBeNull();
    act(() => jest.advanceTimersByTime(10_000));
    expect(view.getByTestId('computing.flight.nym', hidden)).toBeTruthy();
    // The words fade into the new step.
    act(() => jest.advanceTimersByTime(1_000));
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.step-nym',
    );
  });

  test('Tests that a send stays Through NYM when its transaction is only transmitted', () => {
    const view = computing({ phase: 'created', txids: ['abc'], subject }, [
      row('abc', RPCValueTransfersStatusEnum.transmitted),
    ]);
    expect(view.getByTestId('computing.flight.nym', hidden)).toBeTruthy();
    expect(view.getByTestId('computing.view')).toHaveTextContent(
      'send.view-transaction',
    );
  });

  test('Tests that a send waits in the mempool when its transaction is there', () => {
    const view = computing({ phase: 'created', txids: ['abc'], subject }, [
      row('abc', RPCValueTransfersStatusEnum.mempool),
    ]);
    expect(view.getByTestId('computing.flight.pool', hidden)).toBeTruthy();
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.step-pool',
    );
  });

  test('Tests that a send fills a block per confirmation when it is mined', () => {
    const view = computing({ phase: 'created', txids: ['abc'], subject }, [
      row('abc', RPCValueTransfersStatusEnum.confirmed, 2),
    ]);
    expect(view.getByTestId('computing.flight.conf', hidden)).toBeTruthy();
    expect(view.getAllByTestId('computing.block-filled', hidden)).toHaveLength(
      2,
    );
  });

  test('Tests that a send says Sent with how much and to whom when it has its confirmations', () => {
    const view = computing({ phase: 'created', txids: ['abc'], subject }, [
      row('abc', RPCValueTransfersStatusEnum.confirmed, 3),
    ]);
    expect(view.getByTestId('computing.sent')).toBeTruthy();
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.sent-title',
    );
    expect(view.getByText('send.sent-line')).toBeTruthy();
    fireEvent.press(view.getByTestId('computing.done'));
    // Back to the home under it, not a new one on top (React Navigation 7).
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Route.Home,
      { screen: Route.History },
      { pop: true },
    );
  });

  test('Tests that View transaction opens the transaction when History already lists it', () => {
    const vt = row('abc', RPCValueTransfersStatusEnum.mempool);
    const view = computing({ phase: 'created', txids: ['abc'], subject }, [vt]);
    fireEvent.press(view.getByTestId('computing.view'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Route.ValueTransferDetail,
      expect.objectContaining({ vt }),
    );
  });

  test('Tests that a TEX send follows both transactions and offers them together when it went out in two', () => {
    const view = computing(
      { phase: 'created', txids: ['hop', 'pay'], subject },
      [
        row('hop', RPCValueTransfersStatusEnum.confirmed, 1),
        row('pay', RPCValueTransfersStatusEnum.mempool),
      ],
    );
    expect(view.getByTestId('computing.flight.pool', hidden)).toBeTruthy();
    expect(view.getByText('send.sending-line-two')).toBeTruthy();
    expect(view.getByTestId('computing.view')).toHaveTextContent(
      'send.view-transactions',
    );
  });

  test('Tests that a shield says Shielded when it has its confirmations', () => {
    const view = computing(
      {
        phase: 'created',
        txids: ['abc'],
        subject: { ...subject, kind: 'shield' },
      },
      [
        row(
          'abc',
          RPCValueTransfersStatusEnum.confirmed,
          3,
          ValueTransferKindEnum.Shield,
        ),
      ],
    );
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.shielded-title',
    );
  });
});

describe('Computing failures', () => {
  test('Tests that a send failed while creating shows the cross and nothing to view', () => {
    const view = computing(
      { phase: 'failed', stage: 'create', since: SINCE, subject },
      [row('old', RPCValueTransfersStatusEnum.failed)],
    );
    expect(view.getByTestId('computing.failed')).toBeTruthy();
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.fail-create-title',
    );
    expect(view.queryByTestId('computing.view')).toBeNull();
    expect(view.getByTestId('computing.leave')).toBeTruthy();
  });

  test('Tests that a send failed while sending offers its failed transaction when it was created', () => {
    const view = computing(
      { phase: 'failed', stage: 'send', since: SINCE, subject },
      [row('abc', RPCValueTransfersStatusEnum.failed)],
    );
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.fail-send-title',
    );
    expect(view.getByTestId('computing.sub')).toHaveTextContent(
      'send.fail-send-body',
    );
    expect(view.getByTestId('computing.view')).toBeTruthy();
  });

  test('Tests that a TEX send says transaction 2 was rejected when its hop went out', () => {
    const view = computing(
      { phase: 'failed', stage: 'rejected', since: SINCE, subject },
      [
        row(
          'hop',
          RPCValueTransfersStatusEnum.transmitted,
          0,
          ValueTransferKindEnum.SendToSelf,
        ),
        row('pay', RPCValueTransfersStatusEnum.failed),
      ],
    );
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.fail-rejected-title-2',
    );
    expect(view.getByTestId('computing.sub')).toHaveTextContent(
      'send.fail-partial-body',
    );
    expect(view.getByTestId('computing.view')).toHaveTextContent(
      'send.view-transactions',
    );
  });

  test('Tests that a send that went out says it expired when its transaction turns failed', () => {
    const view = computing({ phase: 'created', txids: ['abc'], subject }, [
      row('abc', RPCValueTransfersStatusEnum.failed),
    ]);
    expect(view.getByTestId('computing.failed')).toBeTruthy();
    expect(view.getByTestId('computing.title')).toHaveTextContent(
      'send.fail-expired-title',
    );
  });
});
