/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import PrivKeyModal from '../components/PrivKeyModal';

jest.useFakeTimers()

// test suite
describe("Component PrivKeyModal - test", () => {
  //snapshot test
  test("PrivKeyModal - snapshot", () => {
    const privKeyModal = create(<PrivKeyModal address={''} keyType={0} privKey={''} closeModal={() => {}} />);
    expect(privKeyModal.toJSON()).toMatchSnapshot();
  });

});
