/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Receive from '../components/Receive';
import { defaultAppStateLoaded, ContextLoadedProvider } from '../app/context';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.mock('react-native-tab-view', () => ({
  TabView: '',
  TabBar: '',
}));
jest.mock('react-native-option-menu', () => '');
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// test suite
describe('Component Receive - test', () => {
  //snapshot test
  test('Receive Landscape - snapshot', () => {
    const state = defaultAppStateLoaded;
    state.uaAddress = 'UA-12345678901234567890';
    state.addresses = [
      {
        uaAddress: 'UA-12345678901234567890',
        address: 'UA-12345678901234567890',
        addressKind: 'u',
        containsPending: false,
        receivers: 'ozt',
      },
      {
        uaAddress: 'UA-12345678901234567890',
        address: 'sapling-12345678901234567890',
        addressKind: 'z',
        containsPending: false,
        receivers: 'z',
      },
      {
        uaAddress: 'UA-12345678901234567890',
        address: 'transparent-12345678901234567890',
        addressKind: 't',
        containsPending: false,
        receivers: 't',
      },
    ];
    state.translate = () => 'text translated';
    state.dimensions = {
      width: 600,
      height: 300,
      orientation: 'landscape',
      deviceType: 'phone',
      scale: 2.5,
    };
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.12345678;
    const onFunction = jest.fn();
    const receive = render(
      <ContextLoadedProvider value={state}>
        <Receive
          fetchTotalBalance={onFunction}
          setUaAddress={onFunction}
          toggleMenuDrawer={onFunction}
          startRescan={onFunction}
          syncingStatusMoreInfoOnClick={onFunction}
          poolsMoreInfoOnClick={onFunction}
          setZecPrice={onFunction}
        />
      </ContextLoadedProvider>,
    );
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
