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

import TransparentWarning from '../screens/Receive/components/TransparentWarning';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

describe('TransparentWarning - snapshot', () => {
  test('TransparentWarning renders correctly', () => {
    const state = { ...defaultAppContextLoaded };
    state.translate = mockTranslate;
    const onFn = jest.fn();

    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <TransparentWarning onSuccess={onFn} closeSheet={onFn} />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
