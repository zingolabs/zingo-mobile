/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import SeedComponent from '../components/SeedComponent';

jest.useFakeTimers()

// test suite
describe("Component SeedComponent - test", () => {
  //snapshot test
  test("SeedComponent - snapshot", () => {
    const seedComponent = create(<SeedComponent seed={''} birthday={0} nextScreen={() => {}} />);
    expect(seedComponent.toJSON()).toMatchSnapshot();
  });

});
