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
  ValueTransferKindEnum,
} from '@app/AppState';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { REVEAL_MS } from '@app/utils/reveal';
import Insight from '@screens/Insight';
import { advance } from '../__mocks__/advanceTimers';
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

const launchAddTagModal = jest.fn();

const insightWith = (privacy: boolean) => (
  <ContextAppLoadedProvider
    value={{
      ...defaultAppContextLoaded,
      translate: (k: string) => k,
      addressBook: [ana],
      launchAddTagModal,
      privacy,
      valueTransfers: [
        sent('u1ana', 2, 'a'),
        sent('u1stranger0000000000000000xyz', 1, 'b'),
      ],
    }}
  >
    <Insight
      navigation={mockNavigation}
      route={{ key: 'insight', name: 'Insight', params: undefined }}
    />
  </ContextAppLoadedProvider>
);

const renderInsight = (privacy = false) => render(insightWith(privacy));

beforeEach(() => {
  launchAddTagModal.mockClear();
});

test('Tests that only a recipient outside the book offers to add it when the list holds a contact and an unknown address.', () => {
  renderInsight();
  expect(screen.queryByTestId('insight.row.0.add')).toBeNull();
  fireEvent.press(screen.getByTestId('insight.row.1.add'));
  expect(launchAddTagModal).toHaveBeenCalledWith(
    'u1stranger0000000000000000xyz',
  );
});

test('Tests that a row unfolds its sends, amount and bytes when it is tapped.', () => {
  renderInsight();
  expect(screen.queryByTestId('insight.row.0.detail')).toBeNull();
  fireEvent.press(screen.getByTestId('insight.row.0'));
  expect(screen.getByTestId('insight.row.0.detail')).toBeTruthy();
});

test('Tests that the donut center shows the total sent when nothing is selected.', () => {
  renderInsight();
  expect(
    screen.getByTestId('insight.donut.value.big-part').props.children,
  ).toBe(' 3.0');
  fireEvent.press(screen.getByTestId('insight.metric.sends'));
  expect(screen.getByTestId('insight.donut.value').props.children).toBe('2');
});

describe('Insight - privacy', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('Tests that the address of a row outside the book shows its mask when privacy is on.', () => {
    renderInsight(true);

    expect(screen.getByText('u1.....')).toBeTruthy();
    expect(screen.queryByText('u1stran...0000xyz')).toBeNull();
  });

  test('Tests that the address of a row shows when it is tapped, and shows its mask again when the reveal time ends.', () => {
    renderInsight(true);

    fireEvent.press(screen.getByText('u1.....'));
    expect(screen.getByText('u1stran...0000xyz')).toBeTruthy();

    advance(REVEAL_MS);
    expect(screen.getByText('u1.....')).toBeTruthy();
  });

  test('Tests that a revealed address shows its mask when privacy turns off and on again.', () => {
    const { rerender } = renderInsight(true);

    fireEvent.press(screen.getByText('u1.....'));
    rerender(insightWith(false));
    rerender(insightWith(true));

    expect(screen.getByText('u1.....')).toBeTruthy();
  });

  test('Tests that the donut caption shows the mask of the address when privacy is on and the row is selected.', () => {
    renderInsight(true);

    fireEvent.press(screen.getByTestId('insight.row.1'));

    expect(screen.getByText(/^u1\.\.\.\.\. · /)).toBeTruthy();
    expect(screen.queryByText(/u1stran/)).toBeNull();
  });
});
