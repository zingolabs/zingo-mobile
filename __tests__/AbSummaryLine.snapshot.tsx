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

import AbSummaryLine from '../components/AddressBook/components/AbSummaryLine';
import { AddressBookActionEnum, ModeEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

describe('AbSummaryLine - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.addressBook = mockAddressBook;
  state.totalBalance = mockTotalBalance;
  state.mode = ModeEnum.advanced;

  const onFn = jest.fn();

  test('AbSummaryLine normal contact', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <AbSummaryLine
            index={0}
            item={mockAddressBook[0]}
            openAbDetail={onFn}
            handleScrollToTop={onFn}
            doAction={
              onFn as (
                a: AddressBookActionEnum,
                l: string,
                addr: string,
                c: string,
              ) => void
            }
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('AbSummaryLine protected address', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <AbSummaryLine
            index={1}
            item={mockAddressBook[1]}
            openAbDetail={onFn}
            handleScrollToTop={onFn}
            doAction={
              onFn as (
                a: AddressBookActionEnum,
                l: string,
                addr: string,
                c: string,
              ) => void
            }
            addressProtected
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('AbSummaryLine readOnly mode', () => {
    const roState = { ...state, readOnly: true };
    expect(
      render(
        <ContextAppLoadedProvider value={roState}>
          <AbSummaryLine
            index={0}
            item={mockAddressBook[0]}
            openAbDetail={onFn}
            handleScrollToTop={onFn}
            doAction={
              onFn as (
                a: AddressBookActionEnum,
                l: string,
                addr: string,
                c: string,
              ) => void
            }
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
