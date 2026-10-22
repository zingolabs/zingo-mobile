/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { space12, space16, space8, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import { WalletIcon } from '@ui/primitives/Icons/WalletIcon';
import SheetTitle from './SheetTitle';

type InsufficientFundsSheetProps = {
  /** Shielded balance the wallet can spend, in ZEC display units. */
  spendable: number;
  /**
   * Balance minus the route's sell-side fees and the deposit's own network
   * fee reserve: the largest amount that can actually be swapped.
   */
  maxSpendableForSwap: number;
  onReduce: (amount: string) => void;
};

/** Down to the zatoshi, dropping anything finer, so the figure named is held. */
function truncateToZatoshis(amount: number): string {
  return (Math.floor(amount * 1e8) / 1e8).toFixed(8);
}

/**
 * The amount asked for is more than the wallet can spend. Offers the way out:
 * reducing to the largest swappable amount, which is what the user would
 * otherwise work out by hand, and which the bare balance would get wrong
 * because the fees come out of it.
 */
const InsufficientFundsSheet = forwardRef<
  BottomSheetModal,
  InsufficientFundsSheetProps
>(({ spendable, maxSpendableForSwap, onReduce }, ref) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const dismiss = useCallback(() => {
    (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
  }, [ref]);
  const reduced = truncateToZatoshis(maxSpendableForSwap);

  return (
    <AppSheetModal
      ref={ref}
      header={
        <SheetTitle
          title={translate('swap.insufficient-title') as string}
          onClose={dismiss}
          closeLabel={translate('swap.close') as string}
        />
      }
      contentStyle={{ paddingBottom: 30 }}
    >
      <View style={{ paddingHorizontal: space16 }}>
        <View style={{ alignItems: 'center', marginBottom: space12 }}>
          <WalletIcon size={40} color={colors.fgWarning} />
        </View>
        <Text variant="body" style={{ textAlign: 'center' }}>
          {translate('swap.insufficient-body') as string}
        </Text>
        <Text
          variant="bodySmall"
          tone="muted"
          style={{ textAlign: 'center', marginTop: space8 }}
        >
          {maxSpendableForSwap > 0
            ? maxSpendableForSwap < spendable
              ? (translate('swap.reduce-note-fees') as string)
              : (translate('swap.reduce-note-all') as string)
            : (translate('swap.insufficient-hint') as string)}
        </Text>
        <View style={{ marginTop: space16 }}>
          <ButtonStack>
            <Button
              variant="quiet"
              title={translate('swap.close') as string}
              onPress={dismiss}
            />
            {maxSpendableForSwap > 0 && (
              <Button
                testID="swap.reduce"
                variant="primary"
                title={`${translate('swap.reduce-to') as string} ${reduced} ZEC`}
                onPress={() => {
                  onReduce(reduced);
                  dismiss();
                }}
              />
            )}
          </ButtonStack>
        </View>
      </View>
    </AppSheetModal>
  );
});

export default InsufficientFundsSheet;
