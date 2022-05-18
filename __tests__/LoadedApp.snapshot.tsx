/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import LoadedApp from '../app/LoadedApp';

jest.mock("react-native-iphone-x-helper", () => ({
  getStatusBarHeight: jest.fn(),
  getBottomSpace: jest.fn(),
}));
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: ''
}));
jest.mock('react-native-appearance', () => ({
  AppearanceProvider: jest.fn(),
}));
jest.useFakeTimers()

// test suite
describe("Component LoadedApp - test", () => {
  //snapshot test
  test("LoadedApp - snapshot", () => {
    const loadedApp = create(<LoadedApp navigation={null} />);
    expect(loadedApp.toJSON()).toMatchSnapshot();
  });

});
