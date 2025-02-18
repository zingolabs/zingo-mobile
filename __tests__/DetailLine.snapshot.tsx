/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import DetailLine from '../components/Components/DetailLine';
import { View } from 'react-native';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';

jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(() => Promise.resolve('mocked clipboard content')),
  setString: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useTheme: () => (mockTheme),
}));

// test suite
describe('Component DetailLine - test', () => {
  //snapshot test
  test('DetailLine value - snapshot', () => {
    const detail = render(<DetailLine label="label" value="value" />);
    expect(detail.toJSON()).toMatchSnapshot();
  });
  test('DetailLine children - snapshot', () => {
    const children = <View />;
    const detail = render(<DetailLine label="label" children={children} />);
    expect(detail.toJSON()).toMatchSnapshot();
  });
});
