/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { space16, space20, useTheme, radiusPill, space8 } from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import { Route } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import {
  SwapDirectionEnum,
  SwapStatusEnum,
  awaitsDeposit,
  depositPhase,
  hasDepositEvidence,
  formatAmountForDisplay,
  isRefunding,
  isTerminalStatus,
  providerShortLabel,
  slowDeposit,
} from '@app/swap';
import { leaveFlow } from '@app/navigation/navigate';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import Banner from '@ui/widgets/Banner';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import SwapFlight from '@ui/widgets/Flight/SwapFlight';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import { useSwapRecord } from '@screens/Swap/useSwapRecord';
import { swapStepIndex, swapStepKeys } from '@screens/Swap/swapProgress';

type SwapTrackingProps = NativeStackScreenProps<
  AppDrawerParamList,
  typeof Route.SwapTracking
>;

/**
 * The swap on its way: the token flies from coin to coin through the
 * provider, and the step the poller has reached is told under it with its
 * dots. Buying ZEC, the first step waits for the payment with the way back
 * to the slip; half an hour on with nothing seen, a warning says what to
 * check. No time shows. Leaving is free: the poller keeps watching, and the
 * record keeps the place.
 */
const SwapTracking: React.FunctionComponent<SwapTrackingProps> = ({
  navigation,
  route,
}) => {
  const { recordId } = route.params;
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const record = useSwapRecord(recordId);
  const t = (key: string) => translate(key) as string;

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const awaiting = !!record && awaitsDeposit(record);
  useEffect(() => {
    if (!awaiting) {
      return;
    }
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [awaiting]);

  // An expired swap, or a late payment on its way back, has no result
  // screen: its detail says why.
  useEffect(() => {
    if (!record) {
      return;
    }
    if (isRefunding(record)) {
      navigation.replace(Route.SwapDetail, { recordId });
      return;
    }
    if (isTerminalStatus(record.status)) {
      navigation.replace(
        record.status === SwapStatusEnum.Expired
          ? Route.SwapDetail
          : Route.SwapResult,
        { recordId },
      );
    }
  }, [record, navigation, recordId]);

  if (!record) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  const isOutbound = record.direction === SwapDirectionEnum.Outbound;
  const steps = swapStepKeys(record.direction);
  /** One rule for the words and the flight: a payment seen is detected. */
  const current = Math.min(
    swapStepIndex({ ...record, depositSeen: hasDepositEvidence(record) }),
    steps.length - 1,
  );
  const symbol = (asset: typeof record.sellAsset) =>
    asset.ticker ?? asset.symbol;
  const provider = providerShortLabel(record.provider);
  const line = `${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${symbol(
    record.sellAsset,
  )} → ${formatAmountForDisplay(
    record.actualReceiveAmount ?? record.expectedReceiveAmount,
  )} ${symbol(record.receiveAsset)} · ${provider}`;

  const notDetected = depositPhase(record, nowMs) === 'notDetected';
  /** A slow chain's payment is seen late: the wait says so before it worries anyone. */
  const slowWait = awaiting && !notDetected && slowDeposit(record);

  return (
    <SwapFlowScreen
      testID="swap.tracking"
      title=""
      center
      footer={
        <View style={{ rowGap: space8 }}>
          <Button
            testID="swap.tracking.leave"
            variant="primary"
            title={t('swap.back-to-zingo')}
            onPress={() => leaveFlow(navigation)}
          />
          <Text
            variant="caption"
            tone="muted"
            style={{ textAlign: 'center', marginTop: space8 }}
          >
            {t('swap.tracking-background')}
          </Text>
        </View>
      }
    >
      <View style={{ alignItems: 'center' }}>
        <SwapFlight
          from={record.sellAsset}
          to={record.receiveAsset}
          provider={provider}
          nym={isOutbound}
          waiting={awaiting}
          width={width - space20 * 2}
        />
        <Text
          testID="swap.tracking.step"
          variant="subtitle"
          style={{
            marginTop: 32,
            textAlign: 'center',
          }}
        >
          {t(steps[current])}
        </Text>
        <Text
          variant="bodySmall"
          tone="muted"
          style={{
            marginTop: 4,
            textAlign: 'center',
            fontVariant: ['tabular-nums'],
          }}
        >
          {line}
        </Text>
        {slowWait && (
          <Text
            testID="swap.tracking.slow"
            variant="bodySmall"
            tone="muted"
            style={{ marginTop: space8, textAlign: 'center' }}
          >
            {t('swap.slow-deposit').replace(
              '{chain}',
              chainDisplayName(record.sellAsset.chain),
            )}
          </Text>
        )}
        <View
          testID="swap.tracking.steps"
          style={{ flexDirection: 'row', columnGap: 8, marginTop: 20 }}
        >
          {steps.map((key, index) => (
            <View
              key={key}
              style={{
                width: 6,
                height: 6,
                borderRadius: radiusPill,
                backgroundColor:
                  index < current
                    ? colors.fgAccent
                    : index === current
                      ? colors.fgWarning
                      : colors.borderMuted,
              }}
            />
          ))}
        </View>
        {notDetected && (
          <View style={{ alignSelf: 'stretch', marginTop: space16 + 8 }}>
            <Banner
              testID="swap.tracking.not-detected"
              tone="warning"
              title={t('swap.not-detected-title')}
              action={
                <Button
                  testID="swap.tracking.review-payment"
                  variant="text"
                  size="small"
                  inline
                  title={t('swap.not-detected-review')}
                  onPress={() =>
                    navigation.replace(Route.SwapDeposit, { recordId })
                  }
                />
              }
            >
              {t('swap.not-detected-body')
                .replace(
                  '{amount}',
                  formatAmountForDisplay(record.sellAmountHumanDecimal),
                )
                .replace('{coin}', symbol(record.sellAsset))}
            </Banner>
          </View>
        )}
      </View>
    </SwapFlowScreen>
  );
};

export default SwapTracking;
