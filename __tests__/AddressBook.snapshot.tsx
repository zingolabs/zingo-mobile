/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, RenderResult } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { AddressBook } from '../components/AddressBook';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.AddressBook
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.AddressBook,
      params: undefined,
    },
  };
}
// test suite
describe('Component Address Book - test', () => {
  //snapshot test
  test('Address Book - snapshot', () => {
    const state = { ...defaultAppContextLoaded };
    state.addressBook = mockAddressBook;
    state.translate = mockTranslate;
    const onSet = jest.fn();
    const props = makeDrawerProps();
    const ab: RenderResult = render(
      <ContextAppLoadedProvider value={state}>
        <AddressBook {...props} setAddressBook={onSet} />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
});
