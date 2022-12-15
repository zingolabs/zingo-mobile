/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import CircularProgress from '../components/CircularProgress';

jest.useFakeTimers();

// test suite
describe('Component About - test', () => {
  //snapshot test
  test('About - snapshot', () => {
    const about = create(
      <CircularProgress
        size={100}
        strokeWidth={5}
        textSize={20}
        text={((2 * 100) / 4).toFixed(0).toString() + '%'}
        progressPercent={(2 * 100) / 4}
      />,
    );
    expect(about.toJSON()).toMatchSnapshot();
  });
});
