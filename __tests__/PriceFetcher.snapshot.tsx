/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import PriceFetcher from '../components/Components/PriceFetcher';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
// test suite
describe('Component PriceFetcher - test', () => {
  // The ring renders only for a Nym-consenting session; the snapshot
  // pins that state, not the empty unconsented render.
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.nym = true;
  state.zecPrice = { zecPrice: 33.33, date: 1 };
  //snapshot test
  test('PriceFetcher - snapshot', () => {
    const price = render(
      <ContextAppLoadedProvider value={state}>
        <PriceFetcher textBefore="text before" />
      </ContextAppLoadedProvider>,
    );
    expect(price.toJSON()).toMatchSnapshot();
  });
});
