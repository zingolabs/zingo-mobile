/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
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
import {
  iconSizeSm,
  radiusPill,
  space20,
  space4,
  space8,
  useTheme,
} from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import { Route, ServerType, TranslateType } from '@app/AppState';
import NetInfoType from '@app/AppState/types/NetInfoType';
import { useSyncFreshness } from '@app/hooks/lastSynced';
import { useNowMs } from '@app/hooks/useNowMs';
import { isFallingBehind } from '@app/walletBackend/utils/syncFreshness';
import Text from '@ui/primitives/Text';
import { CARD_MARGIN_TOP } from './PriceRow';
import { CloudDownloadIcon } from '@ui/primitives/Icons/CloudDownloadIcon';
import { ServerHealthView } from '@app/services/serverHealthMonitor';
import { showServerHealth } from '@app/services/showServerHealth';
import { hostOf as hostOfUri } from '@screens/Server/useCustomServer';
import { isOurServer } from '@app/uris/serverUris';

type SyncState =
  | 'opening'
  | 'noInternet'
  | 'offline'
  | 'starting'
  | 'syncing'
  | 'behind'
  | 'synced'
  | 'serverSlow'
  | 'serverDown'
  | 'serverUnusable'
  | 'defaultBack';

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

/** The dot of a wallet being opened, beating in the syncing yellow. */
function OpeningDot({ color }: { color: string }) {
  const beat = useSharedValue(1);
  useEffect(() => {
    beat.value = withRepeat(
      withTiming(0.25, {
        duration: 900,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
    return () => cancelAnimation(beat);
  }, [beat]);
  const style = useAnimatedStyle(() => ({ opacity: beat.value }));
  return (
    <Animated.View
      testID="header.sync-opening"
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: radiusPill,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

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
 * added at the end. While the server works, the line names it only when it
 * is Zingo's own, and never beside the sync bar. Tapping it opens the Sync report, or, while the server
 * is slow or down, the server health sheet. When the default server works
 * again it says so, and a tap asks whether to go back.
 */
export default function SyncLine({
  server,
  netInfo,
  percentage,
  syncInProgress,
  translate,
  opening,
  health,
  onDefaultBack,
}: {
  server: ServerType;
  netInfo: NetInfoType;
  /** Outputs scanned, 0 to 100; 0 means the first connection is still being made. */
  percentage: number;
  syncInProgress: boolean;
  translate: (key: string) => TranslateType;
  /** The wallet being opened in place, '' when none is. */
  opening: string;
  health: ServerHealthView;
  /** Asks whether to go back to the default server. */
  onDefaultBack: () => void;
}) {
  const navigation = useNavigation<WalletNavigation>();
  const { colors } = useTheme();
  const t = (key: string) => translate(key) as string;
  const freshness = useSyncFreshness();
  /** Never wider than the screen inside its gutters; the words give way. */
  const maxWidth = useWindowDimensions().width - 2 * space20;
  const nowMs = useNowMs();

  const state: SyncState = opening
    ? 'opening'
    : !netInfo.isConnected
      ? 'noInternet'
      : server.kind === 'offline'
        ? 'offline'
        : health.level === 'down'
          ? 'serverDown'
          : health.level === 'unusable'
            ? 'serverUnusable'
            : health.level === 'slow'
              ? 'serverSlow'
              : health.defaultBack
                ? 'defaultBack'
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
  /** One thing at a time: mobile data only when the line warns about nothing else. */
  const showMetered =
    metered &&
    (state === 'synced' || state === 'syncing' || state === 'starting');

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
  /** Zingo's own server is named while it works, any other only when it fails. */
  const ours = server.kind === 'remote' && isOurServer(server.uri);
  const named = (head: React.ReactNode): React.ReactNode =>
    ours ? (
      <>
        {`${hostOf(server)} · `}
        {head}
      </>
    ) : (
      head
    );
  const namedLabel = (text: string): string =>
    ours ? `${hostOf(server)} · ${text}` : text;
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
    case 'opening':
      lead = <OpeningDot color={colors.fgSyncing} />;
      words = strong(
        t('wallets.opening').replace('{name}', opening),
        colors.fgSyncing,
      );
      label = t('wallets.opening').replace('{name}', opening);
      break;
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
      words = named(aged(strong(t('header.sync-behind'), colors.fgWarning)));
      label = [namedLabel(t('header.sync-behind')), balanceAge]
        .filter(Boolean)
        .join('. ');
      break;
    case 'starting':
      lead = <Spinner track={colors.sheetHandle} arc={colors.fgMuted} />;
      words = ours
        ? t('header.sync-connecting').replace('{host}', hostOf(server))
        : t('server.connecting');
      label = words as string;
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
      /** The bar and the percentage say enough: no server name here. */
      words = strong(
        t('header.sync-syncing').replace('{n}', String(Math.floor(percentage))),
        colors.fgSyncing,
      );
      label = t('header.sync-syncing').replace(
        '{n}',
        String(Math.floor(percentage)),
      );
      break;
    case 'serverSlow':
    case 'serverDown':
    case 'serverUnusable':
    case 'defaultBack': {
      const key = {
        serverSlow: 'header.sync-server-slow',
        serverDown: 'header.sync-server-down',
        serverUnusable: 'header.sync-server-unusable',
        defaultBack: 'header.sync-server-back',
      }[state];
      const said = t(key).replace(
        '{host}',
        state === 'defaultBack' ? hostOfUri(health.defaultUri) : hostOf(server),
      );
      lead = (
        <View
          testID={`header.sync-${state}`}
          style={{
            width: 7,
            height: 7,
            borderRadius: radiusPill,
            backgroundColor:
              state === 'serverSlow'
                ? colors.fgWarning
                : state === 'defaultBack'
                  ? colors.fgAccent
                  : colors.fgDanger,
          }}
        />
      );
      words = said;
      label = said;
      break;
    }
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
      words = named(t('header.sync-synced'));
      label = namedLabel(t('header.sync-synced'));
  }

  const serverState =
    state === 'serverSlow' ||
    state === 'serverDown' ||
    state === 'serverUnusable';
  const onPress = serverState
    ? showServerHealth
    : state === 'defaultBack'
      ? onDefaultBack
      : () => navigation.navigate(Route.SyncReport);
  const action = serverState
    ? t('header.sync-open-health')
    : state === 'defaultBack'
      ? ''
      : t('header.sync-open-report');

  return (
    <Pressable
      kind="row"
      testID="header.syncline"
      accessibilityRole="button"
      accessibilityLabel={[
        label,
        showMetered ? t('header.sync-mobile-data') : '',
        action,
      ]
        .filter(Boolean)
        .join('. ')}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 28,
        maxWidth,
        /** The price card sits this far below; the same above centres the line. */
        marginTop: CARD_MARGIN_TOP,
        paddingHorizontal: 12,
        borderRadius: radiusPill,
      }}
    >
      <View style={{ marginRight: space8, flexShrink: 0 }}>{lead}</View>
      {/* The words in one Text, cut at the end when the line runs out of room. */}
      <Text
        variant="caption"
        tone="muted"
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{ flexShrink: 1 }}
      >
        {words}
      </Text>
      {showMetered && (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}
        >
          <Text variant="caption" tone="muted">
            {' · '}
          </Text>
          {/* 1, off the spacing scale on purpose: the icon clears the " · " in this line only. */}
          <View style={{ marginLeft: 1 }}>
            <CloudDownloadIcon size={iconSizeSm} color={colors.fgWarning} />
          </View>
          <View style={{ marginLeft: space4 }}>
            {strong(t('header.sync-mobile-data'), colors.fgWarning)}
          </View>
        </View>
      )}
    </Pressable>
  );
}
