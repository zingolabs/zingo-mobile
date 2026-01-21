/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import App from '../App';

jest.mock('@noble/hashes/sha2.js', () => ({
  sha256: jest.fn(() => new Uint8Array([1, 2, 3])), // lo que necesites
}));

jest.mock('@noble/hashes/utils.js', () => ({
  utf8ToBytes: jest.fn(_s => new Uint8Array([1, 2, 3])),
}));

// test suite
describe('Component App - test', () => {
  //snapshot test
  test('App - snapshot', () => {
    const receive = render(<App />);
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
