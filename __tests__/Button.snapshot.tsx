/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Button from '../components/Components/Button';

// test suite
describe('Component Button - test', () => {
  //snapshot test
  const onPress = jest.fn();
  test('Button Primary - snapshot', () => {
    const button = render(
      <Button
        variant="primary"
        title={'Primary button'}
        disabled={false}
        onPress={onPress}
        style={{}}
      />,
    );
    expect(button.toJSON()).toMatchSnapshot();
  });

  test('Button Secondary - snapshot', () => {
    const button = render(
      <Button
        variant="secondary"
        title={'Secondary button'}
        disabled={false}
        onPress={onPress}
        style={{}}
      />,
    );
    expect(button.toJSON()).toMatchSnapshot();
  });
});
