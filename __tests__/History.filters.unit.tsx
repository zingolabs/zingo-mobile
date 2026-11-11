/**
 * @format
 */

import 'react-native';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import Filters, { filterOf, kindOf } from '@screens/History/components/Filters';

describe('History filters', () => {
  test('Tests that the one filter is read back from the flags when several are stored', () => {
    expect(filterOf(null, false, false)).toBe('all');
    expect(filterOf('swaps', false, false)).toBe('swaps');
    expect(filterOf('sent', true, false)).toBe('failed');
    expect(filterOf(null, false, true)).toBe('memo');
  });

  test('Tests that kindOf returns the kind when the picked filter is one, and null when it is all, failed or memo', () => {
    expect(kindOf('swaps')).toBe('swaps');
    expect(kindOf('received')).toBe('received');
    expect(kindOf('all')).toBeNull();
    expect(kindOf('failed')).toBeNull();
    expect(kindOf('memo')).toBeNull();
  });

  test('Tests that Apply leaves exactly one filter on when a chip is picked', () => {
    const setKind = jest.fn();
    const setFailed = jest.fn();
    const setMemos = jest.fn();
    const setFunds = jest.fn();
    const close = jest.fn();
    const screen = render(
      <ContextAppLoadedProvider value={defaultAppContextLoaded}>
        <Filters
          closeSheet={close}
          filterKind={'sent'}
          setFilterKind={setKind}
          filterFailed={false}
          setFilterFailed={setFailed}
          filterMemos={true}
          setFilterMemos={setMemos}
          filterWithFunds={true}
          setFilterWithFunds={setFunds}
        />
      </ContextAppLoadedProvider>,
    );
    fireEvent.press(screen.getByTestId('history.filter.swaps'));
    fireEvent.press(screen.getByTestId('history.filter.apply'));
    expect(setKind).toHaveBeenCalledWith('swaps');
    expect(setFailed).toHaveBeenCalledWith(false);
    expect(setMemos).toHaveBeenCalledWith(false);
    expect(setFunds).toHaveBeenCalledWith(false);
    expect(close).toHaveBeenCalled();
  });
});
