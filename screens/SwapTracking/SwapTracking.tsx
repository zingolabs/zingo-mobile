/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radiusMd, space12, space16, useTheme } from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import { Route } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { SwapDirectionEnum, isTerminalStatus } from '@app/swap';
import { leaveFlow } from '@app/navigation/navigate';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import SwapSummaryCard from '@screens/Swap/components/SwapSummaryCard';
import { useSwapRecord } from '@screens/Swap/useSwapRecord';
import { SWAP_STEP_COUNT, swapStepIndex } from '@screens/Swap/swapProgress';

type SwapTrackingProps = NativeStackScreenProps<
  AppDrawerParamList,
  typeof Route.SwapTracking
>;

/**
 * The swap on its way, in three steps the poller advances. Leaving is free:
 * the poller keeps watching, and the record keeps the place.
 */
const SwapTracking: React.FunctionComponent<SwapTrackingProps> = ({
  navigation,
  route,
}) => {
  const { recordId } = route.params;
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
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

  return (
    <SwapFlowScreen
      testID="swap.tracking"
      title={translate('swap.tracking-title') as string}
      footer={
        <Button
          testID="swap.tracking.leave"
          variant="primary"
          title={translate('swap.back-to-zingo') as string}
          onPress={() => leaveFlow(navigation)}
        />
      }
    >
      <SwapSummaryCard
        sides={[
          {
            label: translate('swap.you-send') as string,
            asset: record.sellAsset,
            amount: record.sellAmountHumanDecimal,
            usdUnitPrice: record.fiatValueBasis.sellUsdUnitPrice,
          },
          {
            label: isOutbound
              ? (translate('swap.you-receive') as string)
              : (translate('swap.receive-in-zingo') as string),
            asset: record.receiveAsset,
            amount: record.actualReceiveAmount ?? record.expectedReceiveAmount,
            usdUnitPrice: record.fiatValueBasis.receiveUsdUnitPrice,
          },
        ]}
      />
      <View
        testID="swap.tracking.steps"
        style={{
          marginTop: space12,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          borderRadius: radiusMd,
          padding: space16,
        }}
      >
        {steps.map((key, index) => {
          const done = index < current;
          const now = index === current;
          return (
            <View key={key}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  columnGap: 12,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor:
                      done || now ? colors.borderAccent : colors.borderMuted,
                    backgroundColor: done ? colors.bgAccent : colors.bgCanvas,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {done && <CheckIcon size={11} color={colors.fgOnAccent} />}
                  {now && (
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: colors.bgAccent,
                      }}
                    />
                  )}
                </View>
                <Text
                  variant="bodyStrong"
                  tone={done || now ? 'default' : 'muted'}
                  style={{ paddingVertical: 6 }}
                >
                  {translate(key) as string}
                </Text>
              </View>
              {index < steps.length - 1 && (
                <View style={{ width: 20, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 2,
                      height: 22,
                      backgroundColor: done
                        ? colors.bgAccent
                        : colors.borderMuted,
                    }}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Text
        variant="caption"
        tone="muted"
        style={{ textAlign: 'center', marginTop: space16 }}
      >
        {translate('swap.tracking-background') as string}
      </Text>
    </SwapFlowScreen>
  );
};

export default SwapTracking;
