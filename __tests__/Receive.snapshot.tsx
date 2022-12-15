/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import Receive from '../components/Receive';
import { ContextLoadedProvider } from '../app/context';

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-tab-view', () => ({
  TabView: '',
  TabBar: '',
}));
jest.mock('react-native-option-menu', () => '');
jest.useFakeTimers();

// test suite
describe('Component Receive - test', () => {
  //snapshot test
  test('Receive - snapshot', () => {
    const state = {
      uaAddress: 'UA',
      addresses: [
        {
          uaAddress: 'UA',
          address: 'UA',
          addressKind: 'u',
          containsPending: false,
          receivers: 'ozt',
        },
      ],
      translate: () => 'text translated',
      dimensions: {
        width: 200,
        height: 200,
      },
      totalBalance: {
        total: 0,
      },
    };
    const receive = create(
      <ContextLoadedProvider value={state}>
        <Receive
          fetchTotalBalance={() => {}}
          setUaAddress={() => {}}
          toggleMenuDrawer={() => {}}
          startRescan={() => {}}
          syncingStatusMoreInfoOnClick={() => {}}
          poolsMoreInfoOnClick={() => {}}
        />
      </ContextLoadedProvider>,
    );
    expect(receive.toJSON()).toMatchSnapshot();
  });
});

