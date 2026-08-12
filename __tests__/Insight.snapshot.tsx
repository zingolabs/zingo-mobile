/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Insight from '../screens/Insight';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Insight
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Insight,
      params: undefined,
    },
  };
}
// test suite
describe('Component Insight - test', () => {
  //snapshot test
  test('Insight - snapshot', () => {
    const state = { ...defaultAppContextLoaded };
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const props = makeDrawerProps();
    const insight = render(
      <ContextAppLoadedProvider value={state}>
        <Insight {...props} />
      </ContextAppLoadedProvider>,
    );
    expect(insight.toJSON()).toMatchSnapshot();
  });
});
