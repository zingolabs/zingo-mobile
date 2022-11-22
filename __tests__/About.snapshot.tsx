/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import AboutModal from '../components/About';

jest.useFakeTimers();

// test suite
describe('Component AboutModal - test', () => {
  //snapshot test
  test('AboutModal - snapshot', () => {
    const aboutModal = create(<AboutModal closeModal={() => {}} />);
    expect(aboutModal.toJSON()).toMatchSnapshot();
  });
});
