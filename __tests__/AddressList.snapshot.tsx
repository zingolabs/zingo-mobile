/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { AddressList } from '../components/AddressList';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { AddressKindEnum } from '../app/AppState';

// test suite
describe('Component Unified Address List - test', () => {
  //snapshot test
  test('Address Unified List - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.addresses = mockAddresses;
    state.translate = mockTranslate;
    const onSet = jest.fn();
    const al: any = render(
      <ContextAppLoadedProvider value={state}>
        <AddressList addressKind={AddressKindEnum.u} setIndex={onSet} />
      </ContextAppLoadedProvider>,
    );
    expect(al.toJSON()).toMatchSnapshot();
  });

  test('Address Transparent List - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.addresses = mockAddresses;
    state.translate = mockTranslate;
    const onSet = jest.fn();
    const al: any = render(
      <ContextAppLoadedProvider value={state}>
        <AddressList addressKind={AddressKindEnum.t} setIndex={onSet} />
      </ContextAppLoadedProvider>,
    );
    expect(al.toJSON()).toMatchSnapshot();
  });
});
