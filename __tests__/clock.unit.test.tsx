/**
 * @format
 */

import 'react-native';
import React from 'react';
import { act, render } from '@testing-library/react-native';
import { useSyncExternalStore } from 'react';
import Text from '@ui/primitives/Text';
import { subscribeClock } from '@app/time/clock';
import { useNowMs } from '@app/hooks/useNowMs';
import {
  listJournal,
  mixnetJournal,
  subscribeJournal,
} from '@app/walletBackend/modules/MixnetJournal';

jest.useFakeTimers();

function NowReader() {
  return <Text testID="now">{String(useNowMs())}</Text>;
}

function JournalReader() {
  const entries = useSyncExternalStore(subscribeJournal, listJournal);
  return (
    <Text testID="journal">{entries.map(entry => entry.text).join(',')}</Text>
  );
}

describe('clock', () => {
  test('Tests that a reader of the clock repaints when the minute ticks', () => {
    const screen = render(<NowReader />);
    const before = screen.getByTestId('now').props.children;
    act(() => {
      jest.advanceTimersByTime(61 * 1000);
    });
    expect(screen.getByTestId('now').props.children).not.toBe(before);
  });

  test('Tests that the clock runs one interval while read and none after the last reader leaves', () => {
    const interval = jest.spyOn(global, 'setInterval');
    const clear = jest.spyOn(global, 'clearInterval');
    const first = subscribeClock(() => {});
    const second = subscribeClock(() => {});
    expect(interval).toHaveBeenCalledTimes(1);
    first();
    expect(clear).not.toHaveBeenCalled();
    second();
    expect(clear).toHaveBeenCalledTimes(1);
    interval.mockRestore();
    clear.mockRestore();
  });
});

describe('mixnet journal store', () => {
  beforeEach(() => {
    act(() => mixnetJournal.clear());
  });

  test('Tests that a note repaints the readers of the journal', () => {
    const screen = render(<JournalReader />);
    expect(screen.getByTestId('journal').props.children).toBe('');
    act(() => {
      mixnetJournal.note('retry', 'first');
      mixnetJournal.note('draw', 'second');
    });
    expect(screen.getByTestId('journal').props.children).toBe('first,second');
  });
});
