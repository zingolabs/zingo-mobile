import React, { useContext } from 'react';
import { ContextAppLoaded } from '@app/context';
import { useShieldFunds } from '@app/hooks/useShieldFunds';
import Banner from '@ui/widgets/Banner';
import Button from '@ui/primitives/Button';

/**
 * ZEC a swap or a refund left in the transparent balance, with the way to
 * shield it beside the words. It folds away once nothing transparent is
 * left. The header runs the shield proposal; this only offers the action.
 */
export default function ShieldNote({ text }: { text: string }) {
  const context = useContext(ContextAppLoaded);
  const { translate, totalBalance, shieldingAmount } = context;
  const shield = useShieldFunds({ ...context, setShieldingAmount: undefined });
  if ((totalBalance?.totalTransparentBalance ?? 0) <= 0) {
    return null;
  }
  return (
    <Banner
      tone="warning"
      title={text}
      actionBeside
      action={
        <Button
          testID="swap.shield-note.shield"
          inline
          size="small"
          variant="text"
          title={translate('swap.shield') as string}
          disabled={
            shieldingAmount <= 0 || shield.calculateDisableButtonToShield()
          }
          onPress={shield.onPressShieldFunds}
        />
      }
    />
  );
}
