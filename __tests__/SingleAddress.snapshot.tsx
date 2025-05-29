/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import SingleAddress from '../components/Components/SingleAddress';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { TransparentAddressClass, UnifiedAddressClass } from '../app/AppState';

// test suite
describe('Component SingleAddress - test', () => {
  //snapshot test
  test('SingleAddress - snapshot', () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    const single = render(
      <SingleAddress address={mockAddresses[0] as UnifiedAddressClass & TransparentAddressClass} index={0} total={1} prev={onPrev} next={onNext} setSecurityOption={jest.fn()} />,
    );
    expect(single.toJSON()).toMatchSnapshot();
  });
});
