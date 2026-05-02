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

import ContactList from '../components/Messages/components/ContactList';
import {
  ModeEnum,
  RouteEnum,
  SendPageStateClass,
  ServerType,
} from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeProps(): DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.ContactList
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.ContactList,
      params: undefined,
    },
  };
}

describe('ContactList - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.valueTransfers = mockValueTransfers;
  state.addressBook = mockAddressBook;
  state.addresses = mockAddresses;
  state.server = mockServer;
  state.mode = ModeEnum.advanced;

  const onFn = jest.fn();

  test('ContactList advanced mode', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <ContactList
            {...makeProps()}
            toggleMenuDrawer={onFn}
            setScrollToTop={onFn}
            scrollToTop={false}
            setScrollToBottom={onFn}
            scrollToBottom={false}
            sendTransaction={jest.fn(async (_s: SendPageStateClass) => '')}
            setServerOption={jest.fn(async (_v: ServerType) => {})}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
