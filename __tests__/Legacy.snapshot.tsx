/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Legacy from '../components/Legacy';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';

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
describe('Component Legacy - test', () => {
  //snapshot test
  test('Legacy Portrait - snapshot', () => {
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
      width: 200,
      height: 400,
      orientation: 'portrait',
      deviceType: 'tablet',
      scale: 1.5,
    };
    state.info.currencyName = 'ZEC';
    state.zecPrice.zecPrice = 33.33;
    state.totalBalance.total = 1.12345678;
    const onFunction = jest.fn();
    const legacy = render(
      <ContextAppLoadedProvider value={state}>
        <Legacy toggleMenuDrawer={onFunction} />
      </ContextAppLoadedProvider>,
    );
    expect(legacy.toJSON()).toMatchSnapshot();
  });
});
