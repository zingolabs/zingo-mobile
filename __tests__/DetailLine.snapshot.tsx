/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import DetailLine from '../components/Components/DetailLine';
import { View } from 'react-native';

// test suite
describe('Component DetailLine - test', () => {
  //snapshot test
  test('DetailLine value - snapshot', () => {
    const about = render(<DetailLine label="label" value="value" />);
    expect(about.toJSON()).toMatchSnapshot();
  });
  test('DetailLine children - snapshot', () => {
    const children = <View />;
    const detail = render(<DetailLine label="label" children={children} />);
    expect(detail.toJSON()).toMatchSnapshot();
  });
});
