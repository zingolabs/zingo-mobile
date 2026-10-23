import { renderSwapText, swapKey, swapRaw } from '@app/swap/swapText';

const dictionary: Record<string, string> = {
  'swap.line': '{who}: {reason}',
  'swap.who': 'The provider',
  'swap.reason': 'Needs at least {amount}.',
};
const translate = (key: string) => dictionary[key] ?? key;

describe('renderSwapText', () => {
  it('Tests that a key is translated and its params fill the gaps when it has params', () => {
    expect(
      renderSwapText(swapKey('swap.reason', { amount: '2 ZEC' }), translate),
    ).toBe('Needs at least 2 ZEC.');
  });

  it('Tests that a param that is itself a message is rendered in place when messages nest', () => {
    expect(
      renderSwapText(
        swapKey('swap.line', {
          who: swapKey('swap.who'),
          reason: swapKey('swap.reason', { amount: '$1,000' }),
        }),
        translate,
      ),
    ).toBe('The provider: Needs at least $1,000.');
  });

  it('Tests that provider prose comes through as written when it is raw', () => {
    expect(renderSwapText(swapRaw('pool is paused {x}'), translate)).toBe(
      'pool is paused {x}',
    );
  });

  it('Tests that lines are joined one per line when the message has several', () => {
    expect(
      renderSwapText(
        { kind: 'lines', lines: [swapKey('swap.who'), swapRaw('second')] },
        translate,
      ),
    ).toBe('The provider\nsecond');
  });
});
