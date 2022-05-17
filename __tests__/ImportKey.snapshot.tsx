/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import ImportKeyModal from '../components/ImportKey';

jest.useFakeTimers()

// test suite
describe("Component ImportKeyModal - test", () => {
  //snapshot test
  test("Matches the snapshot ImportKeyModal", () => {
    const d = {keyText: '', birthday: ''};
    const importKeyModal = create(<ImportKeyModal closeModal={() => {}} doImport={d} />);
    expect(importKeyModal.toJSON()).toMatchSnapshot();
  });

});
