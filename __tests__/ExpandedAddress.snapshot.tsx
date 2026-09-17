/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';

import ExpandedAddress from '@ui/widgets/ExpandedAddress';

describe('ExpandedAddress - snapshots', () => {
  const onFn = jest.fn();

  test('ExpandedAddress with title and button', () => {
    expect(
      render(
        <ExpandedAddress
          address="u1abc123def456abc123def456abc123def456abc123"
          closeSheet={onFn}
          onCopy={onFn}
          title="My Address"
          button="Copy"
        />,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('ExpandedAddress without optional props', () => {
    expect(
      render(
        <ExpandedAddress
          address="u1abc123def456abc123def456abc123def456abc123"
          closeSheet={onFn}
        />,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
