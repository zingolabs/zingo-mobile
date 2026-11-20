import React, { useContext } from 'react';
import { ContextAppLoaded } from '@app/context';
import { useShieldFunds } from '@app/hooks/useShieldFunds';
import Banner from '@ui/widgets/Banner';
import Button from '@ui/primitives/Button';
import { PoolEnum, ValueTransferKindEnum } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';

/** Whether a transfer left funds in a transparent address of this wallet: one received there, or sent to itself there. */
export function leftTransparentFunds(vt: ValueTransferType): boolean {
  return (
    vt.poolType === PoolEnum.TransparentPool &&
    (vt.kind === ValueTransferKindEnum.Received ||
      vt.kind === ValueTransferKindEnum.SendToSelf ||
      vt.kind === ValueTransferKindEnum.MemoToSelf)
  );
}

/**
 * ZEC a transfer left in the transparent balance, with the way to shield it
 * beside the words. It shows on the condition History's notice shows on,
 * and folds away with it. The header runs the shield proposal; this only
 * offers the action.
 */
export default function ShieldNote({ text }: { text: string }) {
  const context = useContext(ContextAppLoaded);
  const { translate, shieldingAmount } = context;
  const shield = useShieldFunds({ ...context, setShieldingAmount: undefined });
  if (!shield.showShieldButton) {
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
