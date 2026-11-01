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

import NewAddress from '@screens/Receive/components/NewAddress';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';

describe('NewAddress - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.addressBook = mockAddressBook;

  const onFn = jest.fn();

  test('NewAddress kinds and tag', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <NewAddress closeSheet={onFn} setAddressBook={onFn} />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
