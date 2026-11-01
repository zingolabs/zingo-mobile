/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import Button from '@ui/primitives/Button';
import Banner from '@ui/widgets/Banner';
import PrivateAmount from '@ui/widgets/PrivateAmount';
import { ContextAppLoaded } from '@app/context';
import { useOrchardResidualOnly } from '@app/hooks/useOrchardResidualOnly';
import { formatAmount } from '@app/utils/formatAmount';
import { duration } from '@app/theme/motion';

// Colour and opacity are what reduced motion keeps, so the fade runs either
// way.
const variantEnter = () =>
  FadeIn.duration(duration.base).reduceMotion(ReduceMotion.Never);

type IronwoodMigrationBannerProps = {
  // Orchard balance still sitting in the pool, in ZEC.
  amount: number;
  currencyName: string;
  onStart: () => void;
  /** Hides the notice; offered only while Orchard holds just a residual. */
  onHide: () => void;
};

/**
 * Persistent call-to-action on top of the History list: funds in the Orchard
 * pool need to migrate to Ironwood (NU6.3); Start opens the "Meet Ironwood"
 * onboarding.
 */
const IronwoodMigrationBanner: React.FunctionComponent<
  IronwoodMigrationBannerProps
> = ({ amount, currencyName, onStart, onHide }) => {
  const { translate } = useContext(ContextAppLoaded);
  const residualOnly = useOrchardResidualOnly();

  return (
    <Animated.View key="default" entering={variantEnter()}>
      <Banner
        tone="warning"
        plain
        title={translate('ironwoodbanner.pool') as string}
        actionBeside
        // Only a residual left in Orchard, after a migration or with nothing
        // worth migrating: Pools shows it, so here it can go. Real funds keep
        // the notice up.
        action={
          residualOnly ? (
            <Button
              testID="ironwoodbanner.start"
              variant="primary"
              size="small"
              inline
              title={translate('ironwoodbanner.start') as string}
              onPress={onStart}
            />
          ) : (
            <Button
              testID="ironwoodbanner.start"
              variant="primary"
              size="small"
              inline
              title={translate('ironwoodbanner.start') as string}
              onPress={onStart}
            />
          )
        }
        onDismiss={residualOnly ? onHide : undefined}
        dismissBeside
        dismissLabel={translate('ironwoodbanner.hide') as string}
        dismissTestID="ironwoodbanner.hide"
      >
        {translate('ironwoodbanner.balance') as string}{' '}
        <PrivateAmount
          inline
          variant="bodySmall"
          style={{ fontWeight: '700' }}
          text={formatAmount(amount)}
        />{' '}
        {currencyName}
      </Banner>
    </Animated.View>
  );
};

export default IronwoodMigrationBanner;
