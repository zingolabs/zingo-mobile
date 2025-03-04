/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Pools from '../components/Pools';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

// test suite
describe('Component Pools - test', () => {
  //snapshot test
  const state = defaultAppContextLoaded;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  const onSet = jest.fn();
  test('Pools - snapshot', () => {
    const pools = render(
      <ContextAppLoadedProvider value={state}>
        <Pools setPrivacyOption={onSet} />
      </ContextAppLoadedProvider>,
    );
    expect(pools.toJSON()).toMatchSnapshot();
  });
});
