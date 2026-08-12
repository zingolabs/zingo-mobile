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

import MessageLine from '../screens/Messages/components/MessageLine';
import { ModeEnum, ScreenEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';

const FIXED_TIME = 1704067200; // 2024-01-01 00:00:00 UTC (seconds)
const fixedValueTransfers = mockValueTransfers.map(vt => ({
  ...vt,
  time: FIXED_TIME,
}));

describe('MessageLine - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.addressBook = mockAddressBook;
  state.mode = ModeEnum.advanced;

  const onFn = jest.fn();

  test('MessageLine sent with memo, month header', () => {
    const vt = fixedValueTransfers[0];
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <MessageLine
            index={0}
            month="January 2024"
            vt={vt}
            setValueTransferDetailModalShow={onFn}
            screenName={ScreenEnum.MessagesList}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('MessageLine received with messageAddress, no month', () => {
    const vt = fixedValueTransfers[3];
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <MessageLine
            index={1}
            month=""
            vt={vt}
            setValueTransferDetailModalShow={onFn}
            messageAddress="u1abc123def456"
            screenName={ScreenEnum.MessagesList}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
