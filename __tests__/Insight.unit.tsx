import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import {
  AddressBookFileClass,
  ChainNameEnum,
  RouteEnum,
  ValueTransferKindEnum,
} from '@app/AppState';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import Insight from '@screens/Insight';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const nowSec = Date.now() / 1000;

const sent = (address: string, amount: number, txid: string) => ({
  txid,
  kind: ValueTransferKindEnum.Sent,
  confirmations: 10,
  blockheight: 1,
  time: nowSec - 3600,
  address,
  amount,
  memos: [],
  status: RPCValueTransfersStatusEnum.confirmed,
});

const ana = new AddressBookFileClass(
  'Ana',
  'u1ana',
  '#123456',
  false,
  ChainNameEnum.mainChainName,
  'ZEC',
);

const renderInsight = () =>
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: (k: string) => k,
        addressBook: [ana],
        valueTransfers: [
          sent('u1ana', 2, 'a'),
          sent('u1stranger0000000000000000xyz', 1, 'b'),
        ],
      }}
    >
      <Insight
        navigation={mockNavigation}
        route={{ key: 'insight', name: RouteEnum.Insight, params: undefined }}
      />
    </ContextAppLoadedProvider>,
  );

beforeEach(() => {
  jest.mocked(mockNavigation.navigate).mockClear();
});

test('Tests that only a recipient outside the book offers to add it when the list holds a contact and an unknown address.', () => {
  renderInsight();
  expect(screen.queryByTestId('insight.row.0.add')).toBeNull();
  fireEvent.press(screen.getByTestId('insight.row.1.add'));
  expect(mockNavigation.navigate).toHaveBeenCalledWith(RouteEnum.AddressBook, {
    currentAddress: 'u1stranger0000000000000000xyz',
    routeStack: RouteEnum.Insight,
  });
});

test('Tests that a row unfolds its sends, amount and bytes when it is tapped.', () => {
  renderInsight();
  expect(screen.queryByTestId('insight.row.0.detail')).toBeNull();
  fireEvent.press(screen.getByTestId('insight.row.0'));
  expect(screen.getByTestId('insight.row.0.detail')).toBeTruthy();
});

test('Tests that the donut center shows the total sent when nothing is selected.', () => {
  renderInsight();
  expect(screen.getByTestId('insight.donut.value').props.children).toBe(
    '3.0000',
  );
  fireEvent.press(screen.getByTestId('insight.metric.sends'));
  expect(screen.getByTestId('insight.donut.value').props.children).toBe('2');
});
