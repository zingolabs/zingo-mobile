/**
 * The timed reveal of the two amount widgets in privacy mode.
 */
import 'react-native';
import React, { Profiler } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ZecAmount from '@ui/widgets/ZecAmount';
import CurrencyAmount from '@ui/widgets/CurrencyAmount';
import { REVEAL_MS } from '@app/utils/reveal';

const ZEC_MASK = /^-.----$/;
const CURRENCY_MASK = /\$ -.--/;

const onCommit = jest.fn();

const widgets: [string, RegExp, (privacy: boolean) => React.ReactElement][] = [
  [
    'ZecAmount',
    ZEC_MASK,
    (privacy: boolean) => <ZecAmount amtZec={1.5} privacy={privacy} />,
  ],
  [
    'CurrencyAmount',
    CURRENCY_MASK,
    (privacy: boolean) => (
      <CurrencyAmount amtZec={1.5} price={10} privacy={privacy} />
    ),
  ],
];

beforeEach(() => {
  jest.useFakeTimers();
  onCommit.mockClear();
});
afterEach(() => jest.useRealTimers());

test.each(widgets)(
  'Tests that the reveal timer of %s is cleared when the widget unmounts during a reveal.',
  (_name, masked, widget) => {
    const set = jest.spyOn(global, 'setTimeout');
    const clear = jest.spyOn(global, 'clearTimeout');
    const { unmount } = render(widget(true));

    fireEvent.press(screen.getByText(masked));
    const reveals = set.mock.results.filter(
      (_, call) => set.mock.calls[call][1] === REVEAL_MS,
    );
    unmount();

    expect(reveals).toHaveLength(1);
    expect(clear).toHaveBeenCalledWith(reveals[0].value);
  },
);

test.each(widgets)(
  'Tests that %s shows its mask in the same commit when privacy turns on.',
  (_name, masked, widget) => {
    const tree = (privacy: boolean): React.ReactElement => (
      <Profiler id="widget" onRender={onCommit}>
        {widget(privacy)}
      </Profiler>
    );
    const { rerender } = render(tree(false));

    onCommit.mockClear();
    rerender(tree(true));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(screen.getByText(masked)).toBeTruthy();
  },
);
