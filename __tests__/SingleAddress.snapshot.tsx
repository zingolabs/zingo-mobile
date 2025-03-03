/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import SingleAddress from '../components/Components/SingleAddress';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';

// test suite
describe('Component SingleAddress - test', () => {
  //snapshot test
  test('SingleAddress - snapshot', () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    const single = render(
      <SingleAddress address={mockAddresses[0].uOrchardAddress} index={0} total={1} prev={onPrev} next={onNext} />,
    );
    expect(single.toJSON()).toMatchSnapshot();
  });
});
