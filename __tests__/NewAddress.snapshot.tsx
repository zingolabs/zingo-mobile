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

import NewAddress from '../components/Receive/components/NewAddress';
import { AddressKindEnum, ScreenEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';

describe('NewAddress - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.addressBook = mockAddressBook;

  const onFn = jest.fn();

  test('NewAddress unified kind', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <NewAddress
            addressKind={AddressKindEnum.u}
            closeSheet={onFn}
            setAddressBook={onFn}
            screenName={ScreenEnum.Receive}
            setHeightLayout={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('NewAddress transparent kind', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <NewAddress
            addressKind={AddressKindEnum.t}
            closeSheet={onFn}
            setAddressBook={onFn}
            screenName={ScreenEnum.Receive}
            setHeightLayout={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
