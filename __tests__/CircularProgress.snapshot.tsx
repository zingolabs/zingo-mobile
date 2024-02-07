/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import CircularProgress from '../components/Components/CircularProgress';

// test suite
describe('Component CircularProgress - test', () => {
  //snapshot test
  test('CircularProgress - snapshot', () => {
    const circular = render(
      <CircularProgress
        size={100}
        strokeWidth={5}
        textSize={20}
        text={((2 * 100) / 4).toFixed(0).toString() + '%'}
        progressPercent={(2 * 100) / 4}
      />,
    );
    expect(circular.toJSON()).toMatchSnapshot();
  });
});
