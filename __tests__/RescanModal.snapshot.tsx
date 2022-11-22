/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import RescanModal from '../components/RescanModal';

jest.useFakeTimers();

// test suite
describe('Component RescanModal - test', () => {
  //snapshot test
  test('RescanModal - snapshot', () => {
    const rescanModal = create(<RescanModal closeModal={() => {}} birthday={0} startRescan={() => {}} />);
    expect(rescanModal.toJSON()).toMatchSnapshot();
  });
});
