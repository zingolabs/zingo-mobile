/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Scanner from '../components/Components/Scanner';

// test suite
describe('Component Scanner - test', () => {
  //snapshot test
  test('Scanner - snapshot', () => {
    const onRead = jest.fn();
    const doCancel = jest.fn();
    const scanner = render(<Scanner onRead={onRead} doCancel={doCancel} title="title" button="button" />);
    expect(scanner.toJSON()).toMatchSnapshot();
  });
});
