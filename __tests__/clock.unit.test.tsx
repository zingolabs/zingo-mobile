/**
 * @format
 */

import 'react-native';
import React from 'react';
import { act, render } from '@testing-library/react-native';
import { useSyncExternalStore } from 'react';
import Text from '@ui/primitives/Text';
import { createClock, type ClockIo } from '@app/time/clock';
import { useNowMs } from '@app/hooks/useNowMs';
import {
  listJournal,
  mixnetJournal,
  subscribeJournal,
} from '@app/walletBackend/modules/MixnetJournal';

const MIN = 60 * 1000;
const BOUNDARY = 1_700_000_040_000;
const START = BOUNDARY + 37_300;

function minuteOf(ms: number): number {
  return Math.floor(ms / MIN) * MIN;
}

type Timer = {
  id: number;
  fire: () => void;
  at: number;
  interval: number | undefined;
};

/** A deterministic time and timer rig: nothing fires unless it is advanced. */
function harness(startMs: number) {
  let nowMs = startMs;
  let nextId = 1;
  const timers: Timer[] = [];
  const byHandle = new Map<unknown, Timer>();
  const io: ClockIo = {
    now: () => nowMs,
    timers: {
      setTimeout(callback, ms) {
        const timer: Timer = {
          id: nextId++,
          fire: callback,
          at: nowMs + ms,
          interval: undefined,
        };
        timers.push(timer);
        byHandle.set(timer.id, timer);
        return timer.id;
      },
      clearTimeout(handle) {
        const timer = byHandle.get(handle);
        if (timer !== undefined) {
          byHandle.delete(handle);
          timers.splice(timers.indexOf(timer), 1);
        }
      },
      setInterval(callback, ms) {
        const timer: Timer = {
          id: nextId++,
          fire: callback,
          at: nowMs + ms,
          interval: ms,
        };
        timers.push(timer);
        byHandle.set(timer.id, timer);
        return timer.id;
      },
      clearInterval(handle) {
        const timer = byHandle.get(handle);
        if (timer !== undefined) {
          byHandle.delete(handle);
          timers.splice(timers.indexOf(timer), 1);
        }
      },
    },
  };
  return {
    io,
    advance(ms: number) {
      const target = nowMs + ms;
      for (;;) {
        const due = timers
          .filter(timer => timer.at <= target)
          .sort((a, b) => a.at - b.at)[0];
        if (due === undefined) {
          break;
        }
        nowMs = due.at;
        if (due.interval === undefined) {
          timers.splice(timers.indexOf(due), 1);
          byHandle.delete(due.id);
        } else {
          due.at += due.interval;
        }
        due.fire();
      }
      nowMs = target;
    },
    jump(ms: number) {
      nowMs += ms;
      const due = timers.filter(timer => timer.at <= nowMs);
      for (const timer of due) {
        if (timer.interval === undefined) {
          timers.splice(timers.indexOf(timer), 1);
          byHandle.delete(timer.id);
        } else {
          timer.at = nowMs + timer.interval;
        }
        timer.fire();
      }
    },
    pending(): number {
      return timers.length;
    },
    nextDeadline(): number | undefined {
      return timers.length === 0
        ? undefined
        : Math.min(...timers.map(timer => timer.at));
    },
  };
}

describe('clock engine', () => {
  test('Tests that the first tick is scheduled at the next minute boundary whatever the subscription phase', () => {
    const rig = harness(START);
    const clock = createClock(rig.io);
    clock.subscribe(() => {});
    expect(rig.pending()).toBe(1);
    expect(rig.nextDeadline()).toBe(minuteOf(START) + MIN);
  });

  test('Tests that ticks recur once per minute and move the read value by one minute each', () => {
    const rig = harness(START);
    const clock = createClock(rig.io);
    const reads: number[] = [];
    clock.subscribe(() => reads.push(clock.read()));
    rig.advance(3 * MIN);
    expect(reads).toEqual([
      minuteOf(START) + MIN,
      minuteOf(START) + 2 * MIN,
      minuteOf(START) + 3 * MIN,
    ]);
    expect(clock.read()).toBe(minuteOf(START) + 3 * MIN);
  });

  test('Tests that the snapshot is stable within a minute and the first tick lands on the boundary', () => {
    const rig = harness(START);
    const clock = createClock(rig.io);
    let calls = 0;
    clock.subscribe(() => calls++);
    rig.advance(20_000);
    expect(calls).toBe(0);
    expect(clock.read()).toBe(minuteOf(START));
    rig.advance(2_700);
    expect(calls).toBe(1);
    expect(clock.read()).toBe(minuteOf(START) + MIN);
  });

  test('Tests that a jump over several minutes catches up with one notification', () => {
    const rig = harness(START);
    const clock = createClock(rig.io);
    let calls = 0;
    clock.subscribe(() => calls++);
    rig.advance(2 * MIN);
    expect(calls).toBe(2);
    rig.jump(10 * MIN);
    expect(calls).toBe(3);
    expect(clock.read()).toBe(minuteOf(START) + 12 * MIN);
    expect(rig.nextDeadline()).toBe(minuteOf(START) + 13 * MIN + 37_300);
  });

  test('Tests that the timer lives exactly as long as the listener set', () => {
    const rig = harness(START);
    const clock = createClock(rig.io);
    let calls = 0;
    const unsubscribe = clock.subscribe(() => calls++);
    expect(rig.pending()).toBe(1);
    unsubscribe();
    expect(rig.pending()).toBe(0);
    rig.advance(5 * MIN);
    expect(calls).toBe(0);
    clock.subscribe(() => calls++);
    expect(rig.pending()).toBe(1);
    rig.advance(MIN);
    expect(calls).toBe(1);
  });

  test('Tests that a listener joining after an idle gap reads the current minute at once', () => {
    const rig = harness(START);
    const clock = createClock(rig.io);
    const unsubscribe = clock.subscribe(() => {});
    unsubscribe();
    rig.jump(7 * MIN);
    clock.subscribe(() => {});
    expect(clock.read()).toBe(minuteOf(START) + 7 * MIN);
  });

  test('Tests that leaving during the aligned wait cancels cleanly and a double unsubscribe is inert', () => {
    const rig = harness(START);
    const clock = createClock(rig.io);
    let calls = 0;
    const unsubscribe = clock.subscribe(() => calls++);
    unsubscribe();
    expect(() => unsubscribe()).not.toThrow();
    rig.advance(2 * MIN);
    expect(calls).toBe(0);
    expect(rig.pending()).toBe(0);
  });
});

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

describe('clock wiring', () => {
  test('Tests that a reader of the wired clock repaints when the minute ticks', () => {
    const screen = render(<NowReader />);
    const before = screen.getByTestId('now').props.children;
    act(() => {
      jest.advanceTimersByTime(61 * 1000);
    });
    expect(screen.getByTestId('now').props.children).not.toBe(before);
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
