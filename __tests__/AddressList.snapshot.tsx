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
import { AddressList } from '../components/AddressList';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { AddressKindEnum, RouteEnum } from '../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(
  ak: AddressKindEnum,
): DrawerScreenProps<AppDrawerParamList, RouteEnum.AddressList> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.AddressList,
      params: {
        addressKind: ak,
        setIndex: jest.fn(),
      },
    },
  };
}
// test suite
describe('Component Unified Address List - test', () => {
  //snapshot test
  test('Address Unified List - snapshot', () => {
    const state = { ...defaultAppContextLoaded };
    state.addresses = mockAddresses;
    state.translate = mockTranslate;
    const props = makeDrawerProps(AddressKindEnum.u);
    const al = render(
      <ContextAppLoadedProvider value={state}>
        <AddressList {...props} />
      </ContextAppLoadedProvider>,
    );
    expect(al.toJSON()).toMatchSnapshot();
  });

  test('Address Transparent List - snapshot', () => {
    const state = { ...defaultAppContextLoaded };
    state.addresses = mockAddresses;
    state.translate = mockTranslate;
    const props = makeDrawerProps(AddressKindEnum.t);
    const al = render(
      <ContextAppLoadedProvider value={state}>
        <AddressList {...props} />
      </ContextAppLoadedProvider>,
    );
    expect(al.toJSON()).toMatchSnapshot();
  });
});
