/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import Button from '../components/Button';

jest.useFakeTimers()

// test suite
describe("Component Button - test", () => {
  //snapshot test
  test("Button Primary - snapshot", () => {
    const button = create(<Button type={'Primary'} title={'Primary'} disabled={false} onPress={() => {}} style={{}} />);
    expect(button.toJSON()).toMatchSnapshot();
  });

  test("Button Secondary - snapshot", () => {
    const button = create(<Button type={'Secondary'} title={'Secondary'} disabled={false} onPress={() => {}} style={{}} />);
    expect(button.toJSON()).toMatchSnapshot();
  });

});
