/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { space16, space20, useTheme, radiusPill } from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import { Route } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import {
  SwapDirectionEnum,
  formatAmountForDisplay,
  isTerminalStatus,
  providerShortLabel,
} from '@app/swap';
import { leaveFlow } from '@app/navigation/navigate';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import SwapFlight from '@ui/widgets/Flight/SwapFlight';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import { useSwapRecord } from '@screens/Swap/useSwapRecord';
import { SWAP_STEP_COUNT, swapStepIndex } from '@screens/Swap/swapProgress';

type SwapTrackingProps = NativeStackScreenProps<
  AppDrawerParamList,
  typeof Route.SwapTracking
>;

/**
 * The swap on its way: the token flies from coin to coin through the
 * provider, and the step the poller has reached is told under it with its
 * dots. Leaving is free: the poller keeps watching, and the record keeps the
 * place.
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

  useEffect(() => {
    if (record && isTerminalStatus(record.status)) {
      navigation.replace(Route.SwapResult, { recordId });
    }
  }, [record, navigation, recordId]);

  if (!record) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  const isOutbound = record.direction === SwapDirectionEnum.Outbound;
  const steps = isOutbound
    ? ['swap.step-sell-1', 'swap.step-sell-2', 'swap.step-sell-3']
    : ['swap.step-buy-1', 'swap.step-buy-2', 'swap.step-buy-3'];
  const current = Math.min(swapStepIndex(record.status), SWAP_STEP_COUNT - 1);
  const symbol = (asset: typeof record.sellAsset) =>
    asset.ticker ?? asset.symbol;
  const provider = providerShortLabel(record.provider);
  const line = `${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${symbol(
    record.sellAsset,
  )} → ${formatAmountForDisplay(
    record.actualReceiveAmount ?? record.expectedReceiveAmount,
  )} ${symbol(record.receiveAsset)} · ${provider}`;

  return (
    <SwapFlowScreen
      testID="swap.tracking"
      title=""
      center
      footer={
        <View>
          <Button
            testID="swap.tracking.leave"
            variant="primary"
            title={translate('swap.back-to-zingo') as string}
            onPress={() => leaveFlow(navigation)}
          />
          <Text
            variant="caption"
            tone="muted"
            style={{ textAlign: 'center', marginTop: space16 }}
          >
            {translate('swap.tracking-background') as string}
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
          {translate(steps[current]) as string}
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
                  index <= current ? colors.fgAccent : colors.sheetHandle,
              }}
            />
          ))}
        </View>
      </View>
    </SwapFlowScreen>
  );
};

export default SwapTracking;
