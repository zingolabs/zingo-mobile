/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import LiquidPrimaryButton from '../components/Components/LiquidButton/LiquidPrimaryButton';

// test suite
describe('Component Button - test', () => {
  //snapshot test
  const onPress = jest.fn();
  test('Button Primary - snapshot', () => {
    const button = render(
      <LiquidPrimaryButton
        title={'Primary button'}
        disabled={false}
        onPress={onPress}
      />,
    );
    expect(button.toJSON()).toMatchSnapshot();
  });

  test('Button Secondary - snapshot', () => {
    const button = render(
      <LiquidPrimaryButton
        tintColor={'#1F1F1F'}
        title={'Secondary button'}
        disabled={false}
        onPress={onPress}
      />,
    );
    expect(button.toJSON()).toMatchSnapshot();
  });
});
