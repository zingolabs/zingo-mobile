/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Button from '../components/Button';

// test suite
describe('Component Button - test', () => {
  //snapshot test
  test('Button Primary - snapshot', () => {
    const button = render(<Button type={'Primary'} title={'Primary'} disabled={false} onPress={() => {}} style={{}} />);
    expect(button.toJSON()).toMatchSnapshot();
  });

  test('Button Secondary - snapshot', () => {
    const button = render(
      <Button type={'Secondary'} title={'Secondary'} disabled={false} onPress={() => {}} style={{}} />,
    );
    expect(button.toJSON()).toMatchSnapshot();
  });
});
