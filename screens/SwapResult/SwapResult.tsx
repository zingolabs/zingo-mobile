/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useState } from 'react';
import { View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radiusMd, space12, space16, space8, useTheme } from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import { Route } from '@app/AppState';
import { ContextAppLoaded, useSwapService } from '@app/context';
import { SwapDirectionEnum, formatAmountForDisplay } from '@app/swap';
import { leaveFlow } from '@app/navigation/navigate';
import { useShieldFunds } from '@app/hooks/useShieldFunds';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import TextField from '@ui/primitives/TextField';
import Banner from '@ui/widgets/Banner';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { RefreshIcon } from '@ui/primitives/Icons/RefreshIcon';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import { ClockIcon } from '@ui/primitives/Icons/ClockIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { ShieldIcon } from '@ui/primitives/Icons/ShieldIcon';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import { useSwapRecord } from '@screens/Swap/useSwapRecord';
import { swapOutcome } from '@screens/Swap/swapProgress';

type SwapResultProps = NativeStackScreenProps<
  AppDrawerParamList,
  typeof Route.SwapResult
>;

/**
 * How the swap ended: paid out, returned, short of the minimum, out of
 * time, or refused. Each names what happened to the money and the one way
 * on from here.
 */
const SwapResult: React.FunctionComponent<SwapResultProps> = ({
  navigation,
  route,
}) => {
  const { recordId } = route.params;
  const context = useContext(ContextAppLoaded);
  const { translate, info, totalBalance } = context;
  const { colors } = useTheme();
  const swapService = useSwapService();
  const record = useSwapRecord(recordId);
  const shield = useShieldFunds(context);
  const [hash, setHash] = useState<string>('');
  const [attaching, setAttaching] = useState<boolean>(false);
  const [attachError, setAttachError] = useState<string>('');

  const home = useCallback(() => leaveFlow(navigation), [navigation]);
  const swapAgain = useCallback(
    () =>
      navigation.reset({
        index: 0,
        routes: [{ name: Route.Home, params: { screen: Route.Swap } }],
      }),
    [navigation],
  );

  const attach = useCallback(async () => {
    const trimmed = hash.trim();
    if (!trimmed || !swapService || !record) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      await swapService.setObservedDepositTxHash({ recordId, hash: trimmed });
      navigation.replace(Route.SwapTracking, { recordId });
    } catch (e) {
      setAttachError(`${e}`);
    } finally {
      setAttaching(false);
    }
  }, [hash, swapService, record, recordId, navigation]);

  if (!record) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  const isOutbound = record.direction === SwapDirectionEnum.Outbound;
  const outcome = swapOutcome(record.status);
  const sellSymbol = record.sellAsset.ticker ?? record.sellAsset.symbol;
  const receiveSymbol =
    record.receiveAsset.ticker ?? record.receiveAsset.symbol;
  const received = record.actualReceiveAmount ?? record.expectedReceiveAmount;
  const transparentFunds = (totalBalance?.totalTransparentBalance ?? 0) > 0;
  const refund = record.refundInfo;

  const head = (
    tone: 'accent' | 'warning' | 'danger' | 'muted',
    icon: React.ReactNode,
    title: string,
    line: string,
  ) => {
    const paint = {
      accent: { bg: colors.bgAccentSubtle, edge: colors.borderAccent },
      warning: { bg: colors.bgWarningSubtle, edge: colors.borderWarning },
      danger: { bg: colors.bgDangerSubtle, edge: colors.borderDanger },
      muted: { bg: colors.bgMutedSubtle, edge: colors.borderMuted },
    }[tone];
    return (
      <View style={{ alignItems: 'center', rowGap: space16 }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: paint.bg,
            borderWidth: 1,
            borderColor: paint.edge,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
        <Text variant="screenTitle" style={{ textAlign: 'center' }}>
          {title}
        </Text>
        <Text
          variant="bodySmall"
          tone="muted"
          style={{ textAlign: 'center', maxWidth: 300 }}
        >
          {line}
        </Text>
      </View>
    );
  };

  const rows = (
    items: [string, string, 'default' | 'accent' | 'warning'][],
  ) => (
    <View
      style={{
        marginTop: space16,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        borderRadius: radiusMd,
        paddingHorizontal: space16,
      }}
    >
      {items.map(([label, value, tone], index) => (
        <View
          key={label}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            columnGap: space12,
            paddingVertical: 11,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: colors.bottomSheetBorder,
          }}
        >
          <Text variant="bodySmall" tone="muted">
            {label}
          </Text>
          <Text
            variant="bodyStrong"
            tone={tone}
            style={{ flexShrink: 1, textAlign: 'right' }}
          >
            {value}
          </Text>
        </View>
      ))}
    </View>
  );

  const shieldNote = (text: string) => (
    <View style={{ marginTop: space16 }}>
      <Banner tone="warning" title={text} />
    </View>
  );

  const hashBox = (
    <View style={{ rowGap: space8 }}>
      <TextField
        testID="swap.result.hash"
        label={translate('swap.deposit-hash') as string}
        value={hash}
        onChangeText={setHash}
        placeholder={translate('swap.deposit-hash-placeholder') as string}
        mono
        error={attachError || undefined}
        trailingLabel={translate('swap.paste') as string}
        onTrailingPress={async () =>
          setHash((await Clipboard.getString()).trim())
        }
      />
      <Button
        inline
        variant="text"
        title={translate('swap.deposit-follow') as string}
        disabled={attaching || hash.trim().length === 0}
        busy={attaching}
        onPress={attach}
      />
    </View>
  );

  if (outcome === 'completed') {
    const title = `${translate('swap.result-received') as string} ${formatAmountForDisplay(received)} ${receiveSymbol}`;
    return (
      <SwapFlowScreen
        testID="swap.result"
        title=""
        center
        footer={
          <ButtonStack>
            {!isOutbound && transparentFunds ? (
              <Button
                variant="quiet"
                title={translate('swap.result-later') as string}
                onPress={home}
              />
            ) : (
              <Button
                variant="text"
                title={translate('swap.result-see-detail') as string}
                onPress={() =>
                  navigation.replace(Route.SwapDetail, { recordId })
                }
              />
            )}
            {!isOutbound && transparentFunds ? (
              <Button
                testID="swap.result.shield"
                variant="primary"
                title={translate('swap.result-shield-now') as string}
                onPress={() => {
                  home();
                  shield.onPressShieldFunds();
                }}
              />
            ) : (
              <Button
                testID="swap.result.done"
                variant="primary"
                title={translate('swap.done') as string}
                onPress={home}
              />
            )}
          </ButtonStack>
        }
      >
        {head(
          'accent',
          <CheckIcon size={38} color={colors.fgAccent} />,
          title,
          isOutbound
            ? (translate('swap.result-at-your-address') as string)
            : (translate('swap.result-in-your-wallet') as string),
        )}
        {!isOutbound &&
          transparentFunds &&
          shieldNote(translate('swap.result-shield-note-received') as string)}
      </SwapFlowScreen>
    );
  }

  if (outcome === 'refunded') {
    const fee = refund?.refundFeeText;
    const back = refund?.refundedAmountText;
    return (
      <SwapFlowScreen
        testID="swap.result"
        title=""
        onClose={home}
        footer={
          <ButtonStack>
            <Button
              variant="quiet"
              title={translate('swap.close') as string}
              onPress={home}
            />
            <Button
              testID="swap.result.retry"
              variant="primary"
              title={translate('swap.result-try-again') as string}
              onPress={swapAgain}
            />
          </ButtonStack>
        }
      >
        {head(
          'warning',
          <RefreshIcon size={34} color={colors.fgWarning} />,
          `${translate('swap.result-refunded-title') as string} ${sellSymbol}`,
          isOutbound
            ? (translate('swap.result-refunded-sell') as string)
            : `${translate('swap.result-refunded-buy-1') as string} ${sellSymbol} ${translate('swap.result-refunded-buy-2') as string}`,
        )}
        {rows([
          [
            translate('swap.result-deposited') as string,
            `${formatAmountForDisplay(refund?.depositedAmountText ?? record.sellAmountHumanDecimal)} ${sellSymbol}`,
            'default',
          ],
          ...(fee
            ? [
                [
                  translate('swap.result-refund-fee') as string,
                  `− ${formatAmountForDisplay(fee)} ${sellSymbol}`,
                  'default',
                ] as [string, string, 'default'],
              ]
            : []),
          ...(back
            ? [
                [
                  translate('swap.result-refunded-amount') as string,
                  `${formatAmountForDisplay(back)} ${sellSymbol}`,
                  'accent',
                ] as [string, string, 'accent'],
              ]
            : []),
          ...(refund?.refundReason
            ? [
                [
                  translate('swap.result-reason') as string,
                  refund.refundReason,
                  'default',
                ] as [string, string, 'default'],
              ]
            : []),
        ])}
        {isOutbound &&
          transparentFunds &&
          shieldNote(translate('swap.result-shield-note-refund') as string)}
      </SwapFlowScreen>
    );
  }

  if (outcome === 'incomplete') {
    const need = record.sellAmountHumanDecimal;
    const got = refund?.depositedAmountText;
    return (
      <SwapFlowScreen
        testID="swap.result"
        title={translate('swap.tracking-title') as string}
        footer={
          <ButtonStack>
            <Button
              variant="quiet"
              title={translate('swap.back-to-zingo') as string}
              onPress={home}
            />
            <Button
              testID="swap.result.topup"
              variant="primary"
              title={translate('swap.result-send-rest') as string}
              onPress={() =>
                navigation.replace(Route.SwapDeposit, { recordId })
              }
            />
          </ButtonStack>
        }
      >
        {head(
          'warning',
          <TriangleAlert size={34} color={colors.fgWarning} />,
          translate('swap.result-incomplete-title') as string,
          translate('swap.result-incomplete-line') as string,
        )}
        {rows([
          ...(got
            ? [
                [
                  translate('swap.result-arrived') as string,
                  `${formatAmountForDisplay(got)} ${sellSymbol}`,
                  'default',
                ] as [string, string, 'default'],
              ]
            : []),
          [
            translate('swap.result-route-needs') as string,
            `${formatAmountForDisplay(refund?.minDepositText ?? need)} ${sellSymbol}`,
            'default',
          ],
        ])}
        <Text
          variant="caption"
          tone="muted"
          style={{ textAlign: 'center', marginTop: space16 }}
        >
          {translate('swap.result-incomplete-note') as string}
        </Text>
      </SwapFlowScreen>
    );
  }

  if (outcome === 'expired') {
    return (
      <SwapFlowScreen
        testID="swap.result"
        title=""
        onClose={home}
        footer={
          <Button
            testID="swap.result.new"
            variant="primary"
            title={translate('swap.result-new-swap') as string}
            onPress={swapAgain}
          />
        }
      >
        {head(
          'muted',
          <ClockIcon size={34} color={colors.fgMuted} />,
          translate('swap.result-expired-title') as string,
          translate('swap.result-expired-line') as string,
        )}
        {!isOutbound && (
          <View
            style={{
              marginTop: space16 + 6,
              borderWidth: 1,
              borderColor: colors.bottomSheetBorder,
              borderRadius: radiusMd,
              padding: space16,
              rowGap: space8,
            }}
          >
            <Text variant="bodyStrong">
              {translate('swap.result-already-paid') as string}
            </Text>
            <Text variant="bodySmall" tone="muted">
              {translate('swap.result-paste-hash') as string}
            </Text>
            {hashBox}
          </View>
        )}
      </SwapFlowScreen>
    );
  }

  if (outcome === 'failed') {
    return (
      <SwapFlowScreen
        testID="swap.result"
        title=""
        center
        footer={
          <ButtonStack>
            <Button
              variant="quiet"
              title={translate('swap.close') as string}
              onPress={home}
            />
            <Button
              testID="swap.result.retry"
              variant="primary"
              title={translate('swap.result-try-again') as string}
              onPress={swapAgain}
            />
          </ButtonStack>
        }
      >
        {head(
          'danger',
          <XIcon size={34} color={colors.fgDanger} />,
          translate('swap.result-failed-title') as string,
          record.failureReason ??
            (isOutbound
              ? (translate('swap.result-failed-sell') as string)
              : (translate('swap.result-failed-buy') as string)),
        )}
      </SwapFlowScreen>
    );
  }

  return (
    <SwapFlowScreen
      testID="swap.result"
      title={translate('swap.tracking-title') as string}
      center
      footer={
        <Button
          variant="primary"
          title={translate('swap.back-to-zingo') as string}
          onPress={home}
        />
      }
    >
      {head(
        'accent',
        <ShieldIcon size={34} color={colors.fgAccent} />,
        translate('swap.pending-swapping') as string,
        `${info.currencyName}`,
      )}
    </SwapFlowScreen>
  );
};

export default SwapResult;
