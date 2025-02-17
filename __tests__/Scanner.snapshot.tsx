/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Scanner from '../components/Components/Scanner';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useTheme: () => (mockTheme),
}));

// test suite
describe('Component Scanner - test', () => {
  //snapshot test
  test('Scanner - snapshot', () => {
    const onRead = jest.fn();
    const scanner = render(<Scanner onRead={onRead} />);
    expect(scanner.toJSON()).toMatchSnapshot();
  });
});
