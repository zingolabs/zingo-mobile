/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import App from '../App';

jest.mock('@react-native-community/netinfo/src/index', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RNCNetInfo = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
    getValueTransfersList: jest.fn(() => '{ "value_transfers": [], "total": 0 }'),
  };

  return RN;
});
jest.mock('react-native-gesture-handler', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RNGestureHandlerModule = {
    attachGestureHandler: jest.fn(),
    createGestureHandler: jest.fn(),
    dropGestureHandler: jest.fn(),
    updateGestureHandler: jest.fn(),
    forceTouchAvailable: jest.fn(),
    hasGenericPassword: jest.fn(),
    getSupportedBiometryType: jest.fn(),
    State: {},
    Directions: {},
  };
  return {
    RNGestureHandlerModule: RN,
  };
});

// test suite
describe('Component App - test', () => {
  //snapshot test
  test('App - snapshot', () => {
    const receive = render(<App />);
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
