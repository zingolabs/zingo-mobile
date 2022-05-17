/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import InfoModal from '../components/InfoModal';

jest.useFakeTimers()

// test suite
describe("Component InfoModal - test", () => {
  //snapshot test
  test("Matches the snapshot InfoModal", () => {
    const infoModal = create(<InfoModal info={null} closeModal={() => {}} />);
    expect(infoModal.toJSON()).toMatchSnapshot();
  });

});
