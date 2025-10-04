/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, RenderResult } from '@testing-library/react-native';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import AbDetail from '../components/AddressBook/components/AbDetail';
import { AddressBookActionEnum, AddressBookFileClass, ScreenEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

// test suite
describe('Component Address Book Details - test', () => {
  //snapshot test
  const state = defaultAppContextLoaded;
  state.addressBook = mockAddressBook;
  state.translate = mockTranslate;
  const onCancel = jest.fn();
  const onAction = jest.fn();
  test('Address Book Datails - Add - snapshot', () => {
    const ab: RenderResult = render(
      <ContextAppLoadedProvider value={state}>
        <AbDetail
          index={-1}
          item={{} as AddressBookFileClass}
          cancel={onCancel}
          action={AddressBookActionEnum.Add}
          doAction={onAction}
          navigation={mockNavigation}
          screenName={ScreenEnum.AddressBook}
        />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
  test('Address Book Datails - Modify - snapshot', () => {
    const ab: RenderResult = render(
      <ContextAppLoadedProvider value={state}>
        <AbDetail
          index={0}
          item={state.addressBook[0]}
          cancel={onCancel}
          action={AddressBookActionEnum.Modify}
          doAction={onAction}
          navigation={mockNavigation}
          screenName={ScreenEnum.AddressBook}
        />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
  test('Address Book Datails - Delete - snapshot', () => {
    const ab: RenderResult = render(
      <ContextAppLoadedProvider value={state}>
        <AbDetail
          index={1}
          item={state.addressBook[1]}
          cancel={onCancel}
          action={AddressBookActionEnum.Delete}
          doAction={onAction}
          navigation={mockNavigation}
          screenName={ScreenEnum.AddressBook}
        />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
});
