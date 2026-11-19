import React, { useContext, useRef } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ContextAppLoaded } from '@app/context';
import { useShieldFunds } from '@app/hooks/useShieldFunds';
import Banner from '@ui/widgets/Banner';
import Button from '@ui/primitives/Button';
import ShieldSheet from '@screens/History/components/ShieldSheet';

/**
 * ZEC a swap or a refund left in the transparent balance, with the way to
 * shield it beside the words. It folds away once nothing transparent is
 * left. Shield asks first in ShieldSheet, as everywhere else.
 */
export default function ShieldNote({ text }: { text: string }) {
  const context = useContext(ContextAppLoaded);
  const { translate, totalBalance, shieldingAmount, mixnetView } = context;
  const shield = useShieldFunds(context);
  const sheetRef = useRef<BottomSheetModal>(null);
  if ((totalBalance?.totalTransparentBalance ?? 0) <= 0) {
    return null;
  }
  return (
    <>
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
            disabled={!shield.showShieldButton}
            onPress={() => sheetRef.current?.present()}
          />
        }
      />
      <ShieldSheet
        ref={sheetRef}
        amount={shieldingAmount}
        fee={shield.shieldingFee}
        mixnetView={mixnetView}
        onShield={shield.shieldNow}
      />
    </>
  );
}
