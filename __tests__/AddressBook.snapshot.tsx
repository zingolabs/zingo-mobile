/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, RenderResult } from '@testing-library/react-native';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { AddressBook } from '../components/AddressBook';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

// test suite
describe('Component Address Book - test', () => {
  //snapshot test
  test('Address Book - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.addressBook = mockAddressBook;
    state.translate = mockTranslate;
    const onSet = jest.fn();
    const ab: RenderResult = render(
      <ContextAppLoadedProvider value={state}>
        <AddressBook setAddressBook={onSet} />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
});
