/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';

import ContactLine from '../components/Messages/components/ContactLine';
import {
  ContactType,
  ModeEnum,
  ScreenEnum,
  ValueTransferKindEnum,
} from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { RPCValueTransfersStatusEnum } from '../app/walletBackend/enums/RPCValueTransfersStatusEnum';

const FIXED_TIME = 1704067200; // 2024-01-01 00:00:00 UTC (seconds)

const mockContact: ContactType = {
  address: 'u1abc123def456abc123def456abc123def456abc123',
  label: 'Alice',
  color: '#FF5733',
  time: FIXED_TIME,
  memos: ['Hello there'],
  confirmations: 22,
  status: RPCValueTransfersStatusEnum.confirmed,
  kind: ValueTransferKindEnum.Received,
};

describe('ContactLine - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.addressBook = mockAddressBook;
  state.totalBalance = mockTotalBalance;
  state.mode = ModeEnum.advanced;

  const onFn = jest.fn();

  test('ContactLine with month header', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <ContactLine
            index={0}
            month="January 2024"
            c={mockContact}
            setMessagesAddressModalShow={onFn}
            screenName={ScreenEnum.ContactList}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('ContactLine no month header, protected', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <ContactLine
            index={1}
            month=""
            c={mockContact}
            setMessagesAddressModalShow={onFn}
            addressProtected
            screenName={ScreenEnum.ContactList}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
