/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { duration, ease } from '@app/theme/motion';
import {
  iconSizeMd,
  iconSizeSm,
  radiusSm,
  space12,
  space20,
  space4,
  space8,
  useTheme,
} from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { formatZecAmount } from '@app/utils/formatZecAmount';
import { useShieldFunds } from '@app/hooks/useShieldFunds';
import { useOrchardResidualOnly } from '@app/hooks/useOrchardResidualOnly';
import Header from '@ui/widgets/Header';
import { useAmountReveal } from '@ui/widgets/PrivateAmount';
import Card from '@ui/widgets/Card';
import ListRow from '@ui/primitives/ListRow';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';
import { ClockIcon } from '@ui/primitives/Icons/ClockIcon';
import { LogIcon } from '@ui/primitives/Icons/LogIcon';
import { TreeIcon } from '@ui/primitives/Icons/TreeIcon';
import { SaplingIcon } from '@ui/primitives/Icons/SaplingIcon';
import { EyeIcon } from '@ui/primitives/Icons/EyeIcon';
import ShieldSheet from '@screens/History/components/ShieldSheet';

const SIDE = 21.5;
const TILE = 36;
const BAR_H = 14;
const BAR_GAP = 2;
/** A pool under 1% still shows. */
const BAR_MIN = 4;
const DIM = 0.42;

type PoolKey = 'ironwood' | 'orchard' | 'sapling' | 'transparent';

type Pool = {
  key: PoolKey;
  total: number;
  /** Spendable for the shielded pools, confirmed for transparent. */
  ready: number;
};

type PoolsProps = NativeStackScreenProps<AppDrawerParamList, 'Pools'>;

/** Each pool's balance, its share of the total, and shielding in place. */
const Pools: React.FunctionComponent<PoolsProps> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const {
    totalBalance,
    info,
    translate,
    addLastSnackbar,
    somePending,
    shieldingAmount,
    orchardPool,
    saplingPool,
    transparentPool,
    readOnly,
    server,
    setShieldingAmount,
    setBackgroundError,
    setScrollToTop,
    setScrollToBottom,
    sendPermitNow,
    mixnetView,
  } = context;
  const { colors } = useTheme();
  const t = (key: string) => translate(key) as string;
  /** One reveal for the screen: a tap on any amount shows them all. */
  const amounts = useAmountReveal();
  const zec = (value: number) => amounts.show(formatZecAmount(value));
  const onAmount = amounts.hidden ? amounts.reveal : undefined;

  const shieldSheetRef = useRef<BottomSheetModal>(null);
  const { showShieldButton, shieldingFee, shieldNow } = useShieldFunds({
    readOnly,
    setShieldingAmount,
    server,
    somePending,
    totalBalance,
    shieldingAmount,
    translate,
    addLastSnackbar,
    setBackgroundError,
    setScrollToTop,
    setScrollToBottom,
    sendPermitNow,
  });
  const orchardResidualOnly = useOrchardResidualOnly();

  const paint = {
    ironwood: { fg: colors.fgIronwood, bg: colors.bgIronwood, Icon: LogIcon },
    orchard: { fg: colors.fgOrchard, bg: colors.bgOrchard, Icon: TreeIcon },
    sapling: { fg: colors.fgSapling, bg: colors.bgSapling, Icon: SaplingIcon },
    transparent: {
      fg: colors.fgTransparent,
      bg: colors.bgTransparent,
      Icon: EyeIcon,
    },
  };

  const pools: Pool[] = totalBalance
    ? [
        {
          key: 'ironwood' as const,
          total: totalBalance.totalIronwoodBalance,
          ready: totalBalance.confirmedIronwoodBalance,
        },
        ...(orchardPool
          ? [
              {
                key: 'orchard' as const,
                total: totalBalance.totalOrchardBalance,
                ready: totalBalance.confirmedOrchardBalance,
              },
            ]
          : []),
        ...(saplingPool
          ? [
              {
                key: 'sapling' as const,
                total: totalBalance.totalSaplingBalance,
                ready: totalBalance.confirmedSaplingBalance,
              },
            ]
          : []),
        ...(transparentPool
          ? [
              {
                key: 'transparent' as const,
                total: totalBalance.totalTransparentBalance,
                ready: totalBalance.confirmedTransparentBalance,
              },
            ]
          : []),
      ]
    : [];
  const total = pools.reduce((sum, pool) => sum + pool.total, 0);

  const note = (
    icon: React.ReactNode,
    text: string,
    action?: React.ReactNode,
  ) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space8,
        paddingLeft: space20 + TILE + space12,
        paddingRight: space20,
        paddingBottom: space12,
        marginTop: -space4,
      }}
    >
      {icon}
      <Text variant="caption" tone="muted" style={{ flex: 1 }}>
        {text}
      </Text>
      {action}
    </View>
  );

  const noteFor = (pool: Pool) => {
    if (pool.key === 'transparent') {
      if (showShieldButton) {
        return note(
          undefined,
          t('pools.transparent-shield'),
          <Button
            testID="pools.shield"
            variant="primary"
            size="small"
            inline
            title={t('shield.button')}
            onPress={() => shieldSheetRef.current?.present()}
          />,
        );
      }
      if (pool.ready > 0 && shieldingAmount === 0 && !somePending) {
        return note(
          <InfoIcon size={iconSizeSm} color={colors.fgMuted} />,
          t('pools.dust'),
        );
      }
      return null;
    }
    // Before confirming: zingolib leaves dust out of the confirmed figure.
    if (pool.key === 'orchard' && orchardResidualOnly && pool.total > 0) {
      return note(
        <InfoIcon size={iconSizeSm} color={colors.fgMuted} />,
        t('pools.orchard-leftover'),
      );
    }
    if (pool.ready < pool.total) {
      return note(
        <ClockIcon size={iconSizeSm} color={colors.fgWarning} />,
        t('pools.confirming').replace(
          '{amount}',
          `${zec(pool.total - pool.ready)} ${info.currencyName}`,
        ),
      );
    }
    return null;
  };

  return (
    <View
      testID="pools"
      style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 4 }}
    >
      <Header
        title={''}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
      />
      <View
        style={{
          height: 44,
          marginTop: 6,
          marginBottom: 10,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Pressable
          testID="pools.back"
          accessibilityRole="button"
          accessibilityLabel={t('pools.back-acc')}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            position: 'absolute',
            left: 10,
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.bgMutedSubtle : undefined,
          })}
        >
          <ChevronLeft size={24} color={colors.fgAccent} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={{ color: colors.fgDefault, fontSize: 18, fontWeight: '700' }}
        >
          {t('pools.title')}
        </Text>
      </View>

      <ScrollView
        testID="pools.scroll-view"
        contentContainerStyle={{
          paddingHorizontal: SIDE,
          paddingBottom: 36,
          gap: space12,
        }}
      >
        {pools.length === 0 ? (
          <ActivityIndicator
            size="large"
            color={colors.fgMuted}
            style={{ marginVertical: 20 }}
          />
        ) : (
          <>
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="bodyStrong">{t('pools.total')}</Text>
                <Text
                  variant="bodyStrong"
                  testID="pools.total"
                  onPress={onAmount}
                >
                  {zec(total)}{' '}
                  <Text variant="bodyStrong" tone="muted">
                    {info.currencyName}
                  </Text>
                </Text>
              </View>
              {/* The shares give the amounts away: only the track while hidden. */}
              <ShareBar
                shares={(amounts.hidden ? [] : pools).map(pool => ({
                  key: pool.key,
                  value: pool.total,
                  color: paint[pool.key].fg,
                }))}
                track={colors.bgMutedSubtle}
              />
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  columnGap: 14,
                  rowGap: 6,
                }}
              >
                {pools.map(pool => (
                  <View
                    key={pool.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 3,
                        backgroundColor: paint[pool.key].fg,
                      }}
                    />
                    <Text variant="caption" tone="muted">
                      {amounts.hidden
                        ? t(`pools.${pool.key}-title`)
                        : `${t(`pools.${pool.key}-title`)} ${
                            total > 0
                              ? Math.round((pool.total / total) * 100)
                              : 0
                          }%`}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            <View style={{ gap: space8 }}>
              {pools.map(pool => {
                const { fg, bg, Icon } = paint[pool.key];
                const transparent = pool.key === 'transparent';
                const readyColor =
                  pool.total === 0
                    ? colors.fgMuted
                    : transparent
                      ? colors.fgTransparent
                      : pool.ready < pool.total
                        ? colors.fgWarning
                        : colors.fgAccent;
                return (
                  <Card key={pool.key} flush testID={`pools.${pool.key}`}>
                    <View style={{ opacity: pool.total === 0 ? DIM : 1 }}>
                      <ListRow
                        leading={
                          <View
                            style={{
                              width: TILE,
                              height: TILE,
                              borderRadius: radiusSm,
                              backgroundColor: bg,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon size={iconSizeMd} color={fg} />
                          </View>
                        }
                        title={t(`pools.${pool.key}-title`)}
                        subtitle={
                          <Text variant="bodySmall" tone="muted">
                            {t(
                              transparent
                                ? 'pools.confirmed'
                                : 'pools.spendable',
                            )}{' '}
                            <Text
                              variant="bodySmall"
                              testID={`pools.${pool.key}.ready`}
                              onPress={onAmount}
                              style={{ color: readyColor, fontWeight: '600' }}
                            >
                              {zec(pool.ready)}
                            </Text>
                          </Text>
                        }
                        trailing={
                          <Text
                            variant="bodyStrong"
                            testID={`pools.${pool.key}.total`}
                            onPress={onAmount}
                            style={transparent ? { color: fg } : undefined}
                          >
                            {zec(pool.total)}{' '}
                            <Text variant="bodyStrong" tone="muted">
                              {info.currencyName}
                            </Text>
                          </Text>
                        }
                      />
                    </View>
                    {noteFor(pool)}
                  </Card>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <ShieldSheet
        ref={shieldSheetRef}
        amount={shieldingAmount}
        fee={shieldingFee}
        mixnetView={mixnetView}
        onShield={shieldNow}
      />
    </View>
  );
};

type Share = { key: string; value: number; color: string };

/**
 * One segment per pool with funds, in its colour, eased to its new width
 * when a balance moves.
 */
const ShareBar: React.FunctionComponent<{ shares: Share[]; track: string }> = ({
  shares,
  track,
}) => {
  const [width, setWidth] = useState<number>(0);
  const shown = shares.filter(share => share.value > 0);
  const sum = shown.reduce((acc, share) => acc + share.value, 0);
  const room = Math.max(0, width - BAR_GAP * Math.max(0, shown.length - 1));
  const raw = shown.map(share => Math.max(BAR_MIN, (share.value / sum) * room));
  const scale = raw.reduce((acc, w) => acc + w, 0) / (room || 1);
  return (
    <View
      accessibilityRole="image"
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      style={{
        height: BAR_H,
        borderRadius: BAR_H / 2,
        overflow: 'hidden',
        flexDirection: 'row',
        gap: BAR_GAP,
        backgroundColor: track,
      }}
    >
      {width > 0 &&
        shown.map((share, i) => (
          <Segment
            key={share.key}
            width={raw[i] / (scale || 1)}
            color={share.color}
          />
        ))}
    </View>
  );
};

const Segment: React.FunctionComponent<{ width: number; color: string }> = ({
  width,
  color,
}) => {
  const shown = useSharedValue(width);
  useEffect(() => {
    shown.value = withTiming(width, {
      duration: duration.screen,
      easing: ease.emphasized,
      reduceMotion: ReduceMotion.System,
    });
  }, [width, shown]);
  const style = useAnimatedStyle(() => ({ width: shown.value }));
  return (
    <Animated.View style={[{ height: BAR_H, backgroundColor: color }, style]} />
  );
};

export default Pools;
