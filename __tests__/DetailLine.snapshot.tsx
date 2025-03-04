/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import DetailLine from '../components/Components/DetailLine';
import RegText from '../components/Components/RegText';

// test suite
describe('Component DetailLine - test', () => {
  //snapshot test
  test('DetailLine value - snapshot', () => {
    const detail = render(<DetailLine label="label" value="value" />);
    expect(detail.toJSON()).toMatchSnapshot();
  });
  test('DetailLine children - snapshot', () => {
    const children = <RegText>{'Hello'}</RegText>;
    const detail = render(<DetailLine label="label" children={children} />);
    expect(detail.toJSON()).toMatchSnapshot();
  });
});
