import React, { useContext } from 'react';
import Pressable from '@ui/primitives/Pressable';

import { ContextAppLoaded } from '@app/context';
import { useTimedReveal } from '@app/hooks/useTimedReveal';
import Text from '@ui/primitives/Text';

/** What stands for an amount while privacy is on. */
export const MASK = '•••••';

/**
 * A formatted amount text with every figure masked; the unit, the `$` and
 * the words around it stay, the sign goes ("−1,23 ZEC" → "••••• ZEC").
 */
export const maskAmounts = (text: string): string =>
  text.replace(/[+\-−]?\d+(?:[.,]\d+)*/g, MASK);

export type AmountReveal = {
  hidden: boolean;
  reveal: () => void;
  /** The text as it shows now: masked while hidden. */
  show: (text: string) => string;
};

/**
 * Whether amounts are hidden by privacy, and the tap that shows them for a
 * few seconds. One per screen when a tap on any amount reveals them all.
 */
export function useAmountReveal(): AmountReveal {
  const { privacy } = useContext(ContextAppLoaded);
  const { visible, reveal } = useTimedReveal(!!privacy);
  const hidden = !visible;
  return {
    hidden,
    reveal,
    show: (text: string) => (hidden ? maskAmounts(text) : text),
  };
}

type PrivateAmountProps = React.ComponentProps<typeof Text> & {
  /** The formatted amount, with its unit. */
  text: string;
  /** A screen's shared reveal; without it the text reveals on its own. */
  reveal?: AmountReveal;
  /** Inside another text: the tap goes on the text itself. */
  inline?: boolean;
};

/** An amount text that privacy masks and a tap reveals for a few seconds. */
export default function PrivateAmount({
  text,
  reveal,
  inline = false,
  ...textProps
}: PrivateAmountProps) {
  const own = useAmountReveal();
  const { hidden, reveal: onReveal, show } = reveal ?? own;
  if (inline) {
    return (
      <Text {...textProps} onPress={hidden ? onReveal : undefined}>
        {show(text)}
      </Text>
    );
  }
  const body = <Text {...textProps}>{show(text)}</Text>;
  return hidden ? (
    <Pressable
      kind="link"
      accessibilityRole="button"
      onPress={onReveal}
      hitSlop={8}
    >
      {body}
    </Pressable>
  ) : (
    body
  );
}
