/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  useTheme,
  iconSizeSm,
  space4,
  space8,
  space12,
  space16,
  space20,
} from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { providerShortLabel } from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import Utils from '@app/utils';
import Text from '@ui/primitives/Text';
import Pressable from '@ui/primitives/Pressable';
import ListRow from '@ui/primitives/ListRow';
import Button from '@ui/primitives/Button';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Card from '@ui/widgets/Card';
import Tag from '@ui/widgets/Tag';
import TitleBar from '@ui/widgets/TitleBar';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { ChevronDown } from '@ui/primitives/Icons/Chevron';
import DetailRows from '@screens/Swap/components/DetailRows';
import { swapStatePill } from '@screens/Swap/swapProgress';

type SwapAddressesProps = {
  /** The wallet's addresses a swap made, each with its swap, newest first. */
  entries: { address: string; record: SwapRecordType }[];
  /** The address book's name for an address, when it has one. */
  tagOf: (address: string) => string | undefined;
  onViewSwap: (recordId: string) => void;
};

/**
 * Your addresses' third group: one address per swap, folded. A row shows the
 * pair, the swap's state and when; its sheet shows the rest and leads to the
 * swap once it is done.
 */
const SwapAddresses: React.FunctionComponent<SwapAddressesProps> = ({
  entries,
  tagOf,
  onViewSwap,
}) => {
  const { translate, language } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const t = (key: string) => translate(key) as string;
  const [open, setOpen] = useState<boolean>(false);
  const [shown, setShown] = useState<string>('');
  const sheetRef = useRef<BottomSheetModal>(null);

  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withTiming(open ? 1 : 0, {
      duration: duration.medium,
      easing: ease.emphasized,
      reduceMotion: ReduceMotion.System,
    });
  }, [open, turn]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 180}deg` }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: turn.value }));

  const pairOf = (record: SwapRecordType) =>
    `${record.sellAsset.ticker ?? record.sellAsset.symbol} → ${
      record.receiveAsset.ticker ?? record.receiveAsset.symbol
    }`;
  const whenOf = (record: SwapRecordType) =>
    Utils.formatDate(record.createdAtMs, 'MMM d, h:mm aaa', language);

  const entry = entries.find(e => e.address === shown);
  const close = () => sheetRef.current?.dismiss();

  return (
    <>
      <Pressable
        kind="row"
        testID="addresslist.swaps"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(o => !o)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: space20,
          marginBottom: space8,
          marginHorizontal: space4,
        }}
      >
        <Text variant="bodySmall" style={{ fontWeight: '700' }}>
          {t('receive.group-swaps')}
        </Text>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}
        >
          <Text variant="caption" tone="muted">
            {entries.length === 1
              ? t('receive.group-count-one')
              : t('receive.group-count').replace('{n}', String(entries.length))}
          </Text>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={iconSizeSm} color={colors.fgMuted} />
          </Animated.View>
        </View>
      </Pressable>
      {open && (
        <Animated.View style={bodyStyle}>
          <Text
            variant="caption"
            tone="muted"
            style={{ marginHorizontal: space4, marginBottom: space8 }}
          >
            {t('receive.swaps-lead')}
          </Text>
          <Card flush>
            {entries.map(({ address, record }, index) => {
              const state = swapStatePill(record.status, t);
              return (
                <ListRow
                  key={address}
                  testID={`addresslist.swap.${address}`}
                  divider={index > 0}
                  title={pairOf(record)}
                  subtitle={
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        columnGap: space8,
                        marginTop: 2,
                      }}
                    >
                      <Tag tone={state.tone}>{state.text}</Tag>
                      <Text variant="caption" tone="muted">
                        {whenOf(record)}
                      </Text>
                    </View>
                  }
                  chevron
                  onPress={() => {
                    setShown(address);
                    sheetRef.current?.present();
                  }}
                />
              );
            })}
          </Card>
        </Animated.View>
      )}
      <AppSheetModal
        ref={sheetRef}
        onDismiss={() => setShown('')}
        header={
          <TitleBar
            title={entry ? pairOf(entry.record) : ''}
            right={{
              icon: XIcon,
              accessibilityLabel: t('close'),
              onPress: close,
            }}
          />
        }
      >
        {!!entry && (
          <View
            testID="addresslist.swap.sheet"
            style={{ marginHorizontal: space20, paddingBottom: space16 }}
          >
            <Text
              variant="caption"
              tone="muted"
              style={{ textAlign: 'center', marginBottom: space12 }}
            >
              {whenOf(entry.record)}
            </Text>
            {(entry.record.removedAtMs !== undefined ||
              !entry.record.swapKitInternalId) && (
              <Text
                testID="addresslist.swap.note"
                variant="bodySmall"
                tone="warning"
                style={{ textAlign: 'center', marginBottom: space12 }}
              >
                {t(
                  entry.record.removedAtMs !== undefined
                    ? 'swap.removed-note'
                    : 'swap.no-swap-id',
                )}
              </Text>
            )}
            <DetailRows
              rows={[
                {
                  label: t('addressbook.tag'),
                  value:
                    tagOf(entry.address) ??
                    `${pairOf(entry.record)} · ${whenOf(entry.record)}`,
                },
                {
                  label: t('swap.provider'),
                  value: providerShortLabel(entry.record.provider),
                },
                ...(entry.record.swapKitInternalId
                  ? [
                      {
                        label: t('swap.detail-swap-id'),
                        value: Utils.trimToSmall(
                          entry.record.swapKitInternalId,
                          6,
                        ),
                        mono: true,
                        copy: entry.record.swapKitInternalId,
                      },
                    ]
                  : []),
                {
                  label: t('swap.detail-status'),
                  value: swapStatePill(entry.record.status, t).text,
                  tone:
                    swapStatePill(entry.record.status, t).tone === 'accent'
                      ? ('positive' as const)
                      : undefined,
                },
                {
                  label: t('receive.new-type'),
                  value: t('receive.shielded-orchard-sapling'),
                },
                {
                  label: t('addressbook.address'),
                  value: Utils.trimToSmall(entry.address, 6),
                  mono: true,
                  copy: entry.address,
                },
              ]}
            />
            {entry.record.removedAtMs === undefined &&
              swapStatePill(entry.record.status, t).tone === 'accent' && (
                <View style={{ marginTop: space16 }}>
                  <Button
                    testID="addresslist.swap.view"
                    variant="primary"
                    title={t('swap.view-swap')}
                    onPress={() => {
                      close();
                      onViewSwap(entry.record.recordId);
                    }}
                  />
                </View>
              )}
          </View>
        )}
      </AppSheetModal>
    </>
  );
};

export default SwapAddresses;
