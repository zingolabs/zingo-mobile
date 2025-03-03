/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import About from '../components/About';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

// test suite
describe('Component About - test', () => {
  //snapshot test
  test('About - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const about = render(
      <ContextAppLoadedProvider value={state}>
        <About />
      </ContextAppLoadedProvider>,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
});
