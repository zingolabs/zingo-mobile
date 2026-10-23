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
import { AddressList } from '@screens/AddressList';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { Route } from '@app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '@app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  AppDrawerParamList,
  'AddressList'
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: Route.AddressList,
      params: { current: mockAddresses[0].address },
    },
  };
}
// test suite
describe('Component Unified Address List - test', () => {
  //snapshot test
  test('Your addresses - snapshot', () => {
    const state = { ...defaultAppContextLoaded };
    state.addresses = mockAddresses;
    state.translate = mockTranslate;
    const props = makeDrawerProps();
    const al = render(
      <ContextAppLoadedProvider value={state}>
        <AddressList {...props} />
      </ContextAppLoadedProvider>,
    );
    expect(al.toJSON()).toMatchSnapshot();
  });
});
