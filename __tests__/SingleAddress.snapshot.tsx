/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import SingleAddress from '../components/Components/SingleAddress';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { ScreenEnum } from '../app/AppState';

// test suite
describe('Component SingleAddress - test', () => {
  //snapshot test
  test('SingleAddress - snapshot', () => {
    const set = jest.fn();
    const single = render(
      <SingleAddress address={mockAddresses[0]} screenName={ScreenEnum.Receive} index={0} setIndex={set} total={1} show={set} />,
    );
    expect(single.toJSON()).toMatchSnapshot();
  });
});
