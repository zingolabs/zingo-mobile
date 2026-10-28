/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
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
import { iconSizeSm, radiusPill, space4, space8, useTheme } from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import { Route, ServerType, TranslateType } from '@app/AppState';
import NetInfoType from '@app/AppState/types/NetInfoType';
import { useSyncFreshness } from '@app/hooks/lastSynced';
import { isFallingBehind } from '@app/walletBackend/utils/syncFreshness';
import Text from '@ui/primitives/Text';
import { CARD_MARGIN_TOP } from './PriceRow';
import { CloudDownloadIcon } from '@ui/primitives/Icons/CloudDownloadIcon';

type SyncState =
  'noInternet' | 'offline' | 'starting' | 'syncing' | 'behind' | 'synced';

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
 * with a green dot, connecting with a spinner, syncing with a yellow bar.
 * How old the balance is shows only when the wallet stopped keeping up: no
 * internet, Offline, or a sync that falls behind the tip. Mobile data is
 * added at the end. Tapping it opens the Sync report.
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
  const freshness = useSyncFreshness();
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const state: SyncState = !netInfo.isConnected
    ? 'noInternet'
    : server.kind === 'offline'
      ? 'offline'
      : percentage === 0
        ? 'starting'
        : syncInProgress
          ? 'syncing'
          : isFallingBehind(freshness, nowMs)
            ? 'behind'
            : 'synced';
  const metered =
    !!netInfo.isConnected &&
    (netInfo.type === NetInfoStateType.cellular ||
      !!netInfo.isConnectionExpensive);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  /** The last moment the wallet was at the tip, which only stops moving when it falls behind. */
  const lastSynced = freshness.caughtUpAtMs;
  const balanceAge =
    lastSynced > 0
      ? t('header.sync-balance-from').replace(
          '{ago}',
          ago(lastSynced, nowMs, t),
        )
      : '';
  const strong = (text: string, color: string) => (
    <Text variant="caption" style={{ color, fontWeight: '600' }}>
      {text}
    </Text>
  );
  /** What the line says, the strong part first; " · " and the age follow. */
  const aged = (head: React.ReactNode): React.ReactNode => (
    <>
      {head}
      {!!balanceAge && ` · ${balanceAge}`}
    </>
  );

  let lead: React.ReactNode;
  let words: React.ReactNode;
  let label: string;
  switch (state) {
    case 'noInternet':
      lead = <CloudDownloadIcon size={iconSizeSm} color={colors.fgWarning} />;
      words = aged(strong(t('header.sync-no-internet'), colors.fgWarning));
      label = [t('header.sync-no-internet'), balanceAge]
        .filter(Boolean)
        .join('. ');
      break;
    case 'offline':
      lead = (
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: radiusPill,
            backgroundColor: colors.borderMuted,
          }}
        />
      );
      words = aged(strong(t('header.sync-offline'), colors.fgWarning));
      label = [t('header.sync-offline'), balanceAge].filter(Boolean).join('. ');
      break;
    case 'behind':
      lead = (
        <View
          testID="header.sync-behind"
          style={{
            width: 7,
            height: 7,
            borderRadius: radiusPill,
            backgroundColor: colors.fgWarning,
          }}
        />
      );
      words = aged(strong(t('header.sync-behind'), colors.fgWarning));
      label = [t('header.sync-behind'), balanceAge].filter(Boolean).join('. ');
      break;
    case 'starting':
      lead = <Spinner track={colors.sheetHandle} arc={colors.fgMuted} />;
      words = t('header.sync-connecting').replace('{host}', hostOf(server));
      label = t('header.sync-connecting').replace('{host}', hostOf(server));
      break;
    case 'syncing':
      lead = (
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
      );
      words = strong(
        t('header.sync-syncing').replace('{n}', String(Math.floor(percentage))),
        colors.fgSyncing,
      );
      label = t('header.sync-syncing').replace(
        '{n}',
        String(Math.floor(percentage)),
      );
      break;
    default:
      lead = (
        <View
          testID="header.checkicon"
          style={{
            width: 7,
            height: 7,
            borderRadius: radiusPill,
            backgroundColor: colors.fgAccent,
          }}
        />
      );
      words = t('header.sync-synced');
      label = t('header.sync-synced');
  }

  return (
    <Pressable
      kind="row"
      testID="header.syncline"
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${t('header.sync-open-report')}`}
      onPress={() => navigation.navigate(Route.SyncReport)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 28,
        /** The price card sits this far below; the same above centres the line. */
        marginTop: CARD_MARGIN_TOP,
        paddingHorizontal: 12,
        borderRadius: radiusPill,
      }}
    >
      <View style={{ marginRight: space8 }}>{lead}</View>
      {/* The words in one Text, so " · " is plain spaces. An icon never goes in a Text. */}
      <Text variant="caption" tone="muted">
        {words}
        {metered && ' · '}
      </Text>
      {metered && (
        <>
          <CloudDownloadIcon size={iconSizeSm} color={colors.fgWarning} />
          <View style={{ marginLeft: space4 }}>
            {strong(t('header.sync-mobile-data'), colors.fgWarning)}
          </View>
        </>
      )}
    </Pressable>
  );
}
