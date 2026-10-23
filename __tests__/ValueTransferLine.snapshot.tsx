/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import ValueTransferLine from '@screens/History/components/ValueTransferLine';
import { ValueTransferKindEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';

const FIXED_TIME = 1704067200; // 2024-01-01 00:00:00 UTC (seconds)
const fixedValueTransfers = mockValueTransfers.map(vt => ({
  ...vt,
  time: FIXED_TIME,
}));

describe('ValueTransferLine - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.addressBook = mockAddressBook;
  state.showSwipeableIcons = true;

  const onFn = jest.fn();
  const registerSwipeable = jest.fn((ref: unknown) => ref);

  test('ValueTransferLine sent confirmed', () => {
    const vt = fixedValueTransfers[0];
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <ValueTransferLine
            index={0}
            hairline={true}
            vt={vt}
            setValueTransferDetailModalShow={onFn}
            registerSwipeable={registerSwipeable}
            closeAllSwipeables={onFn}
            closeOtherSwipeables={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('ValueTransferLine received, no month header', () => {
    const vt = fixedValueTransfers[3];
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <ValueTransferLine
            index={3}
            hairline={true}
            vt={vt}
            setValueTransferDetailModalShow={onFn}
            registerSwipeable={registerSwipeable}
            closeAllSwipeables={onFn}
            closeOtherSwipeables={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('ValueTransferLine pending (0 confirmations)', () => {
    const vt = {
      ...fixedValueTransfers[0],
      confirmations: 0,
      status: RPCValueTransfersStatusEnum.mempool,
      kind: ValueTransferKindEnum.Sent,
    };
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <ValueTransferLine
            index={1}
            hairline={true}
            vt={vt}
            setValueTransferDetailModalShow={onFn}
            registerSwipeable={registerSwipeable}
            closeAllSwipeables={onFn}
            closeOtherSwipeables={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('ValueTransferLine failed transaction', () => {
    const vt = {
      ...fixedValueTransfers[0],
      status: RPCValueTransfersStatusEnum.failed,
      kind: ValueTransferKindEnum.Sent,
    };
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <ValueTransferLine
            index={2}
            hairline={true}
            vt={vt}
            setValueTransferDetailModalShow={onFn}
            registerSwipeable={registerSwipeable}
            closeAllSwipeables={onFn}
            closeOtherSwipeables={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
