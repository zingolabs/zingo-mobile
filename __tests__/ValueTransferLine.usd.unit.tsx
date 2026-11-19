/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import ValueTransferLine from '@screens/History/components/ValueTransferLine';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';

const state = {
  ...defaultAppContextLoaded,
  translate: mockTranslate,
  info: mockInfo,
  addressBook: mockAddressBook,
  zecPrice: { zecPrice: 40, date: 1704067200 },
};

const row = (zecPrice: number) => (
  <ContextAppLoadedProvider value={state}>
    <ValueTransferLine
      index={0}
      hairline={true}
      vt={{ ...mockValueTransfers[0], amount: 2, zecPrice }}
      setValueTransferDetailModalShow={jest.fn()}
      registerSwipeable={jest.fn()}
      closeAllSwipeables={jest.fn()}
      closeOtherSwipeables={jest.fn()}
    />
  </ContextAppLoadedProvider>
);

test("Tests that a row shows no dollars when its transfer kept no price. Today's price would read as what it was worth then.", () => {
  render(row(0));
  expect(screen.queryByText(/\$/)).toBeNull();
});

test('Tests that a row shows dollars at the price its transfer kept', () => {
  render(row(30));
  expect(screen.getByText(/\$60/)).toBeTruthy();
});
