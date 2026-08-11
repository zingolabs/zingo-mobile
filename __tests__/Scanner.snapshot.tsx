/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Scanner from '../ui/widgets/Scanner';

// test suite
describe('Component Scanner - test', () => {
  //snapshot test
  test('Scanner - snapshot', () => {
    const onRead = jest.fn();
    const onClose = jest.fn();
    const scanner = render(
      <Scanner onRead={onRead} onClose={onClose} active={true} />,
    );
    expect(scanner.toJSON()).toMatchSnapshot();
  });
});
