/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import App from '../App';

jest.mock("react-native-iphone-x-helper", () => ({
  getStatusBarHeight: jest.fn(),
  getBottomSpace: jest.fn(),
}));
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: ''
}));
jest.useFakeTimers()

// test suite
describe("Component App - test", () => {
  //snapshot test
  test("App - snapshot", () => {
    const app = create(<App />);
    expect(app.toJSON()).toMatchSnapshot();
  });

});
