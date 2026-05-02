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

import NewAddressTag from '../components/Receive/components/NewAddressTag';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

describe('NewAddressTag - snapshot', () => {
  test('NewAddressTag renders correctly', () => {
    const state = { ...defaultAppContextLoaded };
    state.translate = mockTranslate;
    const onFn = jest.fn();

    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <NewAddressTag
            address="u1abc123def456abc123def456abc123def456abc123"
            closeSheet={onFn}
            setAddressBook={onFn}
            setHeightLayout={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
