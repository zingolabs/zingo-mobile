/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import About from '@screens/About';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '@app/types';
import { RouteEnum } from '@app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.About
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.About,
      params: undefined,
    },
  };
}
// test suite
describe('Component About - test', () => {
  //snapshot test
  test('About - snapshot', () => {
    const state = { ...defaultAppContextLoaded };
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const props = makeDrawerProps();
    const about = render(
      <ContextAppLoadedProvider value={state}>
        <About {...props} />
      </ContextAppLoadedProvider>,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
});
