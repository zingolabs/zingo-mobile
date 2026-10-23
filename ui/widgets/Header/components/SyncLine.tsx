/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import { WalletNavigation } from '@app/types';
import { radiusPill, useTheme, iconSizeSm } from '@app/theme';
import { Route, ServerType, TranslateType } from '@app/AppState';
import NetInfoType from '@app/AppState/types/NetInfoType';
import { markSynced, useLastSynced } from '@app/hooks/lastSynced';
import Text from '@ui/primitives/Text';
import { CloudDownloadIcon } from '@ui/primitives/Icons/CloudDownloadIcon';

type SyncState = 'noInternet' | 'offline' | 'starting' | 'syncing' | 'synced';

const MINUTE_MS = 60 * 1000;

/** "just now", "4 min ago": how old the balance on screen is. */
function ago(
  sinceMs: number,
  nowMs: number,
  t: (key: string) => string,
): string {
  const minutes = Math.floor((nowMs - sinceMs) / MINUTE_MS);
  return minutes < 1
    ? t('header.sync-just-now')
    : t('header.sync-minutes-ago').replace('{n}', String(minutes));
}

/** The host a remote server is reached at, as the line names it. */
const hostOf = (server: ServerType): string =>
  server.kind === 'remote'
    ? server.uri.replace(/^[a-z]+:\/\//i, '').replace(/[:/].*$/, '')
    : '';

/** A 12 pt ring turning while the first connection is made. */
function Spinner({ track, arc }: { track: string; arc: string }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(
      withTiming(360, {
        duration: 800,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
    );
    return () => cancelAnimation(turn);
  }, [turn]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
  }));
  return (
    <Animated.View
      style={[
        {
          width: 12,
          height: 12,
          borderRadius: radiusPill,
          borderWidth: 2,
          borderColor: track,
          borderTopColor: arc,
        },
        style,
      ]}
    />
  );
}

/**
 * The line under the balance that says whether that number is final: synced
 * with a green dot, connecting with a spinner, syncing with a yellow bar,
 * and how old the balance is when offline or without internet. Mobile data
 * is added at the end. Tapping it opens the Sync report.
 */
export default function SyncLine({
  server,
  netInfo,
  percentage,
  syncInProgress,
  translate,
}: {
  server: ServerType;
  netInfo: NetInfoType;
  /** Outputs scanned, 0 to 100; 0 means the first connection is still being made. */
  percentage: number;
  syncInProgress: boolean;
  translate: (key: string) => TranslateType;
}) {
  const navigation = useNavigation<WalletNavigation>();
  const { colors } = useTheme();
  const t = (key: string) => translate(key) as string;
  const lastSynced = useLastSynced();
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const state: SyncState = !netInfo.isConnected
    ? 'noInternet'
    : server.kind === 'offline'
      ? 'offline'
      : percentage === 0
        ? 'starting'
        : syncInProgress
          ? 'syncing'
          : 'synced';
  const metered =
    !!netInfo.isConnected &&
    (netInfo.type === NetInfoStateType.cellular ||
      !!netInfo.isConnectionExpensive);

  useEffect(() => {
    if (state === 'synced') {
      markSynced(Date.now());
    }
  }, [state, percentage]);
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  const balanceAge =
    lastSynced > 0
      ? t('header.sync-balance-from').replace(
          '{ago}',
          ago(lastSynced, nowMs, t),
        )
      : '';
  const sep = (
    <Text variant="caption" tone="muted">
      ·
    </Text>
  );
  const strong = (text: string, color: string) => (
    <Text variant="caption" style={{ color, fontWeight: '600' }}>
      {text}
    </Text>
  );

  let body: React.ReactNode;
  let label: string;
  switch (state) {
    case 'noInternet':
      body = (
        <>
          <CloudDownloadIcon size={iconSizeSm} color={colors.fgWarning} />
          {strong(t('header.sync-no-internet'), colors.fgWarning)}
          {!!balanceAge && sep}
          {!!balanceAge && (
            <Text variant="caption" tone="muted">
              {balanceAge}
            </Text>
          )}
        </>
      );
      label = [t('header.sync-no-internet'), balanceAge]
        .filter(Boolean)
        .join('. ');
      break;
    case 'offline':
      body = (
        <>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: radiusPill,
              backgroundColor: colors.borderMuted,
            }}
          />
          {strong(t('header.sync-offline'), colors.fgWarning)}
          {!!balanceAge && sep}
          {!!balanceAge && (
            <Text variant="caption" tone="muted">
              {balanceAge}
            </Text>
          )}
        </>
      );
      label = [t('header.sync-offline'), balanceAge].filter(Boolean).join('. ');
      break;
    case 'starting':
      body = (
        <>
          <Spinner track={colors.sheetHandle} arc={colors.fgMuted} />
          <Text variant="caption" tone="muted">
            {t('header.sync-connecting').replace('{host}', hostOf(server))}
          </Text>
        </>
      );
      label = t('header.sync-connecting').replace('{host}', hostOf(server));
      break;
    case 'syncing':
      body = (
        <>
          <View
            style={{
              width: 56,
              height: 4,
              borderRadius: radiusPill,
              backgroundColor: colors.sheetHandle,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.min(100, Math.max(0, percentage))}%`,
                height: 4,
                borderRadius: radiusPill,
                backgroundColor: colors.fgSyncing,
              }}
            />
          </View>
          {strong(
            t('header.sync-syncing').replace(
              '{n}',
              String(Math.floor(percentage)),
            ),
            colors.fgSyncing,
          )}
        </>
      );
      label = t('header.sync-syncing').replace(
        '{n}',
        String(Math.floor(percentage)),
      );
      break;
    default:
      body = (
        <>
          <View
            testID="header.checkicon"
            style={{
              width: 7,
              height: 7,
              borderRadius: radiusPill,
              backgroundColor: colors.fgAccent,
            }}
          />
          <Text variant="caption" tone="muted">
            {t('header.sync-synced')}
          </Text>
          {sep}
          <Text variant="caption" tone="muted">
            {ago(lastSynced || nowMs, nowMs, t)}
          </Text>
        </>
      );
      label = t('header.sync-synced');
  }

  return (
    <Pressable
      testID="header.syncline"
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${t('header.sync-open-report')}`}
      onPress={() => navigation.navigate(Route.SyncReport)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 8,
        height: 28,
        marginTop: 8,
        paddingHorizontal: 12,
        borderRadius: radiusPill,
        backgroundColor: pressed ? colors.bgMutedSubtle : 'transparent',
      })}
    >
      {body}
      {metered && (
        <>
          {sep}
          <CloudDownloadIcon size={iconSizeSm} color={colors.fgWarning} />
          {strong(t('header.sync-mobile-data'), colors.fgWarning)}
        </>
      )}
    </Pressable>
  );
}
