/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { Pressable as RNPressable, ScrollView, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  iconSize,
  iconSizeMd,
  radiusMd,
  radiusPill,
  radiusSm,
  slopFor,
  space4,
  space8,
  space12,
  space16,
  space20,
  space32,
  textVariants,
  useTheme,
} from '@app/theme';
import Text from '@ui/primitives/Text';
import { ease } from '@app/theme/motion';
import Pressable from '@ui/primitives/Pressable';
import { SnackbarDurationEnum } from '@app/AppState';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { useSyncStatus } from '@app/hooks/useSyncStatus';
import { createAlert } from '@app/services/createAlert';
import { sendEmail } from '@app/services/sendEmail';
import {
  enactGateAnswer,
  resolveTriggerGate,
} from '@app/services/gateController';
import { showConfirm } from '@app/services/showConfirm';
import Utils from '@app/utils';
import { formatInteger } from '@app/utils/formatAmount';
import CircularProgress from '@ui/primitives/CircularProgress';
import InfoTooltip from '@ui/widgets/InfoTooltip';
import Header from '@ui/widgets/Header';
import { BanIcon } from '@ui/primitives/Icons/BanIcon';
import { BlocksIcon } from '@ui/primitives/Icons/BlocksIcon';
import { CheckCircleIcon } from '@ui/primitives/Icons/CheckCircleIcon';
import { ClockIcon } from '@ui/primitives/Icons/ClockIcon';
import { HalfCircleIcon } from '@ui/primitives/Icons/HalfCircleIcon';
import { RescanArrows, RescanCloud } from '@ui/primitives/Icons/RescanIcon';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import {
  BackgroundOutcome,
  backgroundOutcome,
  CellState,
  chainTip,
  heights,
  MAP_COLS,
  MAP_ROWS,
  mapCells,
  scaleMax,
} from '@screens/SyncReport/syncModel';
import { themeTokens } from '@app/theme';

const SIDE = space20;
const SOFT_INK = themeTokens.fgMuted;
const CODE_INK = themeTokens.fgDefault;
const AXIS_INK = themeTokens.fgMuted;
const OK_INK = themeTokens.fgAccent;
const RED_INK = themeTokens.fgDanger;
const GREEN = themeTokens.fgAccent;
const AMBER = themeTokens.fgWarning;
const BLUE = themeTokens.fgCategory2;
const TRACK = themeTokens.bgMutedSubtle;
const TILE_BG = themeTokens.bgMutedSubtle;

const CELL_COLOR: Record<CellState, string> = {
  scanned: GREEN,
  pending: themeTokens.fgScanPending,
  scanning: AMBER,
  refetching: themeTokens.fgSyncing,
  high: themeTokens.fgCategory2,
  low: themeTokens.borderMuted,
};

const BG_KEY: Record<BackgroundOutcome, string> = {
  ok: 'sync.finished-ok',
  skipped: 'sync.skipped',
  failed: 'sync.failed',
  interrupted: 'sync.interrupted',
};

const BG_INK: Record<BackgroundOutcome, string> = {
  ok: OK_INK,
  skipped: SOFT_INK,
  failed: RED_INK,
  interrupted: AMBER,
};

const BG_ICON = iconSizeMd;

const LEGEND: { state: CellState; key: string }[] = [
  { state: 'scanned', key: 'sync.legend-scanned' },
  { state: 'pending', key: 'sync.legend-scanned-pending' },
  { state: 'scanning', key: 'sync.legend-scanning' },
  { state: 'refetching', key: 'sync.legend-refetching' },
  { state: 'high', key: 'sync.legend-high' },
  { state: 'low', key: 'sync.legend-low' },
];

const RING = 76;
const RING_STROKE = 6.5;
const TURN_MS = 700;
const RESCAN_ICON = iconSize;
/**
 * The arrows' centre, (25.33, 23.33) on the icon's 32 grid, from the icon's
 * centre. The turn moves there, rotates and moves back: a percentage
 * transformOrigin left the arrows circling the cloud on Android.
 */
const ARROWS_DX = (RESCAN_ICON * 25.333) / 32 - RESCAN_ICON / 2;
const ARROWS_DY = (RESCAN_ICON * 23.333) / 32 - RESCAN_ICON / 2;
const PULSE_MS = 550;
/** The bar not picked, while the other is. */
const BAR_DIM = 0.35;
const TL_W = 315;
const TL_H = 88;
const MAP_H = 63;

type SyncReportProps = NativeStackScreenProps<AppDrawerParamList, 'SyncReport'>;

const fill = (text: string, values: Record<string, string>): string =>
  Object.entries(values).reduce(
    (out, [key, value]) => out.replace(`{${key}}`, value),
    text,
  );

// The sync report: progress ring, heights, the blocks timeline, the scanning
// map and the last background sync, with the rescan in the header.
const SyncReport: React.FunctionComponent<SyncReportProps> = ({
  navigation,
}) => {
  const {
    doRescan,
    syncingStatus,
    rescan: rescanState,
    birthday,
    translate,
    backgroundSyncInfo,
    language,
    netInfo,
    info,
    server,
    biometrics,
    zingolibVersion,
    setBackgroundError,
    addLastSnackbar,
  } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const { percentageOutputsScanned, syncInProgress } = useSyncStatus({
    syncingStatus,
    noSyncingStatus: true,
  });

  const [tip, setTip] = useState(false);
  const [cardW, setCardW] = useState(TL_W);
  /** The bar and its card picked, as Insight's chart and its rows. */
  const [focus, setFocus] = useState<'server' | 'wallet' | null>(null);
  const toggle = (next: 'server' | 'wallet' | null) =>
    setFocus(prev => (next === null || prev === next ? null : next));

  const serverTip = chainTip(syncingStatus, birthday, info.latestBlock || 0);
  const synced = !syncInProgress && percentageOutputsScanned > 0;
  const pct = synced ? 100 : Math.floor(percentageOutputsScanned);
  const h = heights(syncingStatus, birthday, serverTip, synced);
  const cells = mapCells(syncingStatus, birthday, serverTip, synced);

  const turn = useSharedValue(0);
  const pulse = useSharedValue(1);

  /** Only a user rescan pulses; the sync of new blocks after it does not. */
  const rescanning = rescanState !== 'none';
  useEffect(() => {
    pulse.value = rescanning
      ? withRepeat(
          withSequence(
            withTiming(0.45, { duration: PULSE_MS }),
            withTiming(1, { duration: PULSE_MS }),
          ),
          -1,
        )
      : withTiming(1, { duration: PULSE_MS });
  }, [rescanning, pulse]);

  const arrowsStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ARROWS_DX },
      { translateY: ARROWS_DY },
      { rotate: `${turn.value}deg` },
      { translateX: -ARROWS_DX },
      { translateY: -ARROWS_DY },
    ],
  }));
  const rescanStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const openRescan = () => {
    setTip(false);
    turn.value = 0;
    turn.value = withTiming(360, {
      duration: TURN_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.System,
    });
    showConfirm({
      title: translate('sync.sheet-title') as string,
      message: translate('sync.sheet-sub') as string,
      content: rescanRows,
      buttons: [
        { text: translate('sync.rescan') as string, onPress: rescan },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
    });
  };

  const rescan = async () => {
    if (!netInfo.isConnected || server.kind === 'offline') {
      addLastSnackbar(translate('loadedapp.connection-error') as string);
      return;
    }
    const answer = await resolveTriggerGate(undefined, biometrics, {
      translate,
    });
    const proceed = enactGateAnswer(
      answer,
      {
        lock: () =>
          addLastSnackbar(translate('biometrics-failure-declined') as string),
        notice: message => addLastSnackbar(message),
      },
      translate,
    );
    if (!proceed) {
      return;
    }
    await doRescan();
    addLastSnackbar(
      translate('sync.rescan-started') as string,
      SnackbarDurationEnum.long,
    );
  };

  const reportError = () => {
    createAlert(
      setBackgroundError,
      addLastSnackbar,
      'Background Sync Error',
      backgroundSyncInfo.error ?? '',
      false,
      translate,
      sendEmail,
      zingolibVersion,
    );
  };

  const card = {
    marginTop: space12,
    padding: space16,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colors.bottomSheetBorder,
    backgroundColor: colors.bgSurface,
  };
  const cardHead = (title: string, note: string) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: space8,
      }}
    >
      <Text variant="bodyStrong">{title}</Text>
      <Text variant="caption" tone="muted">
        {note}
      </Text>
    </View>
  );

  const status = synced
    ? (translate('sync.synced') as string)
    : (translate('sync.syncing') as string);
  const sub = !netInfo.isConnected
    ? (translate('sync.offline') as string)
    : synced
      ? fill(translate('sync.both-at') as string, {
          tip: formatInteger(serverTip),
        })
      : fill(translate('sync.at') as string, {
          wallet: formatInteger(h.wallet),
          tip: formatInteger(serverTip),
        });

  const max = scaleMax(serverTip);
  const x = (block: number) => (block / max) * TL_W;
  const x0 = x(birthday);
  const x1 = Math.max(x0 + 0.1, x(h.wallet));
  const xTip = x(serverTip);
  const ticks = Array.from(
    { length: Math.floor(max / 1_000_000) + 1 },
    (_, i) => i * 1_000_000,
  ).filter(v => v < max);
  const birthdayLeft = x0 < TL_W / 2;

  const mapW = TL_W / MAP_COLS;
  const timeOf = (seconds: number, pattern: string) =>
    Utils.formatDate(seconds * 1000, pattern, language);
  const bgStart = Number(backgroundSyncInfo.date);
  const bgEnd = Number(backgroundSyncInfo.dateEnd);
  const bgSameDay =
    bgEnd > 0 && timeOf(bgStart, 'yyyyMMdd') === timeOf(bgEnd, 'yyyyMMdd');
  const bgOutcome = backgroundOutcome(backgroundSyncInfo);
  const bgIcon: Record<BackgroundOutcome, React.ReactNode> = {
    ok: (
      <CheckCircleIcon
        size={BG_ICON}
        color={colors.fgAccent}
        checkColor={colors.fgOnAccent}
      />
    ),
    skipped: <BanIcon size={BG_ICON} color={SOFT_INK} />,
    failed: <TriangleAlert size={BG_ICON} color={RED_INK} />,
    interrupted: <TriangleAlert size={BG_ICON} color={AMBER} />,
  };
  const bgLabel =
    bgOutcome === 'failed' && backgroundSyncInfo.error
      ? 'view-error'
      : BG_KEY[bgOutcome];
  const bgWhen =
    timeOf(bgStart, 'MMM d, yyyy · h:mm:ss') +
    (bgEnd > 0 && bgEnd !== bgStart
      ? ' – ' +
        timeOf(bgEnd, bgSameDay ? 'h:mm:ss aaa' : 'MMM d, yyyy · h:mm:ss aaa')
      : '');

  const startText = translate('sync.sheet-start') as string;
  const [startBefore, startAfter] = startText.split('{n}');
  const rescanRows = (
    <View style={{ marginTop: space8 }}>
      {[
        {
          icon: <BlocksIcon color={colors.fgMuted} />,
          text: (
            <Text variant="bodySmall">
              {startBefore}
              <Text variant="bodySmall" style={{ fontWeight: '700' }}>
                {formatInteger(birthday)}
              </Text>
              {startAfter}
            </Text>
          ),
        },
        {
          icon: <ClockIcon color={colors.fgMuted} />,
          text: translate('sync.sheet-time') as string,
        },
        {
          icon: <HalfCircleIcon color={colors.fgMuted} />,
          text: translate('sync.sheet-incomplete') as string,
        },
      ].map((row, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space12,
            paddingVertical: space12,
            paddingHorizontal: space4,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: colors.bottomSheetBorder,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radiusSm,
              backgroundColor: TILE_BG,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {row.icon}
          </View>
          <Text variant="bodySmall" style={{ flex: 1 }}>
            {row.text}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View
      testID="syncreport"
      style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 4 }}
    >
      <Header
        title={translate('sync.title') as string}
        closeScreen={() => navigation.goBack()}
        backTestID="syncreport.back"
        backAccessibilityLabel={translate('sync.back-acc') as string}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Its own box: a stretching tooltip in the row would sit at the top. */}
            <View>
              <InfoTooltip
                testID="syncreport.info"
                alignEnd
                below
                label={translate('sync.info-acc') as string}
                title={translate('sync.tip-title') as string}
                text={translate('sync.tip-text') as string}
                open={tip}
                onToggle={setTip}
              >
                <View />
              </InfoTooltip>
            </View>
            <Pressable
              kind="icon"
              testID="syncreport.rescan"
              accessibilityRole="button"
              accessibilityLabel={translate('sync.rescan-acc') as string}
              onPress={openRescan}
              hitSlop={slopFor(RESCAN_ICON)}
              style={{ paddingHorizontal: space12 }}
            >
              <Animated.View
                style={[
                  { width: RESCAN_ICON, height: RESCAN_ICON },
                  rescanStyle,
                ]}
              >
                <RescanCloud size={RESCAN_ICON} color={colors.fgMuted} />
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: RESCAN_ICON,
                      height: RESCAN_ICON,
                    },
                    arrowsStyle,
                  ]}
                >
                  <RescanArrows size={RESCAN_ICON} color={colors.fgAccent} />
                </Animated.View>
              </Animated.View>
            </Pressable>
          </View>
        }
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
      />

      <ScrollView
        testID="syncreport.scroll-view"
        onTouchStart={() => tip && setTip(false)}
        contentContainerStyle={{
          paddingHorizontal: SIDE,
          paddingBottom: space32,
        }}
      >
        <View
          style={[
            card,
            {
              marginTop: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space16,
            },
          ]}
        >
          <View>
            <CircularProgress
              size={RING}
              strokeWidth={RING_STROKE}
              bgColor={TRACK}
              pgColor={synced ? GREEN : colors.fgSyncing}
              textSize={14}
              textColor={colors.fgDefault}
              textWeight="bold"
              text={`${pct}%`}
              progressPercent={pct}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text testID="syncreport.status" variant="bodyStrong">
              {status}
            </Text>
            <Text variant="bodySmall" tone="muted">
              {sub}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space8, marginTop: space12 }}>
          {[
            { key: 'sync.server', dot: BLUE, value: h.server },
            { key: 'sync.wallet', dot: GREEN, value: h.wallet },
            { key: 'sync.behind', dot: AMBER, value: h.behind },
          ].map(t => {
            const which = t.key.split('.')[1];
            const pickable = which === 'server' || which === 'wallet';
            const picked = focus === which;
            const Box = pickable ? Pressable : View;
            return (
              <Box
                kind="row"
                key={t.key}
                testID={`syncreport.${which}`}
                accessibilityRole={pickable ? 'button' : undefined}
                accessibilityState={pickable ? { selected: picked } : undefined}
                onPress={pickable ? () => toggle(which) : undefined}
                style={[
                  card,
                  { flex: 1, marginTop: 0, padding: space12 },
                  picked ? { borderColor: t.dot } : null,
                ]}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: radiusPill,
                      backgroundColor: t.dot,
                    }}
                  />
                  <Text variant="caption" tone="muted">
                    {translate(t.key) as string}
                  </Text>
                </View>
                <Text
                  variant="bodySmall"
                  style={{ marginTop: space4, fontWeight: '700' }}
                >
                  {formatInteger(t.value)}
                </Text>
              </Box>
            );
          })}
        </View>

        <View
          style={card}
          onLayout={e => setCardW(e.nativeEvent.layout.width - 34)}
        >
          {cardHead(
            translate('sync.blocks') as string,
            fill(translate('sync.scanned-n') as string, {
              n: formatInteger(h.scanned),
            }),
          )}
          <View>
            <Svg
              width={cardW}
              height={(TL_H * cardW) / TL_W}
              viewBox={`0 0 ${TL_W} ${TL_H}`}
            >
              <Rect x={0} y={22} width={TL_W} height={14} rx={7} fill={TRACK} />
              <Rect
                x={0}
                y={22}
                width={xTip}
                height={14}
                rx={7}
                fill={BLUE}
                opacity={focus === 'wallet' ? BAR_DIM : 1}
              />
              {ticks.map((v, i) => (
                <SvgText
                  key={v}
                  x={i === 0 ? 0 : x(v)}
                  y={12}
                  fontSize={textVariants.caption.fontSize}
                  fill={AXIS_INK}
                  textAnchor={i === 0 ? 'start' : 'middle'}
                >
                  {v ? `${v / 1_000_000}M` : '0'}
                </SvgText>
              ))}
              <Rect
                x={x0}
                y={20}
                width={x1 - x0 + (h.scanned > 0 ? 2 : 0)}
                height={18}
                rx={4}
                fill={GREEN}
                stroke={colors.bgSurface}
                strokeWidth={2}
                opacity={focus === 'server' ? BAR_DIM : 1}
              />
              <Path d={`M${x0} 42V54`} stroke={GREEN} strokeWidth={1.5} />
              <SvgText
                x={birthdayLeft ? x0 + 5 : x0 - 5}
                y={58}
                fontSize={textVariants.caption.fontSize}
                fill={CODE_INK}
                textAnchor={birthdayLeft ? 'start' : 'end'}
              >
                {fill(translate('sync.birthday-at') as string, {
                  n: formatInteger(birthday),
                })}
              </SvgText>
              <Path d={`M${xTip} 42V68`} stroke={BLUE} strokeWidth={1.5} />
              <SvgText
                x={xTip - 5}
                y={76}
                fontSize={textVariants.caption.fontSize}
                fill={CODE_INK}
                textAnchor="end"
              >
                {fill(translate('sync.tip-at') as string, {
                  n: formatInteger(serverTip),
                })}
              </SvgText>
            </Svg>
            {/* Over the chart: the wallet's green bar sits on the server's blue one. */}
            <RNPressable
              testID="syncreport.blocks.hit"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
              }}
              onPress={e => {
                const scale = TL_W / cardW;
                const bx = e.nativeEvent.locationX * scale;
                const by = e.nativeEvent.locationY * scale;
                const onBars = by >= 12 && by <= 46;
                toggle(
                  !onBars
                    ? null
                    : bx >= x0 - 4 && bx <= x1 + 6
                      ? 'wallet'
                      : bx <= xTip
                        ? 'server'
                        : null,
                );
              }}
            />
          </View>
        </View>

        <View style={card}>
          {cardHead(
            translate('sync.map') as string,
            /**
             * zingolib reports what is scanning only as Scanning, without the
             * priority it had (Verify, ChainTip, FoundNote…): the map names no
             * phase it cannot know.
             */
            synced
              ? (translate('sync.all-scanned') as string)
              : `${translate('sync.legend-scanning') as string} · ${pct}%`,
          )}
          <Svg
            testID="syncreport.map"
            width={cardW}
            height={(MAP_H * cardW) / TL_W}
            viewBox={`0 0 ${TL_W} ${MAP_H}`}
          >
            {cells.map((state, i) => {
              const c = Math.floor(i / MAP_ROWS);
              const r = i % MAP_ROWS;
              return (
                <Rect
                  key={i}
                  x={c * mapW}
                  y={r * 10.5}
                  width={mapW - 3}
                  height={7.5}
                  rx={2.5}
                  fill={CELL_COLOR[state]}
                />
              );
            })}
          </Svg>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              rowGap: space4,
              columnGap: space12,
              marginTop: space12,
            }}
          >
            {LEGEND.map(l => (
              <View
                key={l.state}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: radiusPill,
                    backgroundColor: CELL_COLOR[l.state],
                  }}
                />
                <Text variant="caption" tone="muted">
                  {translate(l.key) as string}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {bgStart > 0 && (
          <Pressable
            kind="row"
            testID="syncreport.background"
            disabled={!backgroundSyncInfo.error}
            onPress={reportError}
            style={[
              card,
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: space12,
                paddingVertical: space12,
              },
            ]}
          >
            {bgIcon[bgOutcome]}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                {translate('sync.last-background') as string}
              </Text>
              <Text variant="caption" tone="muted">
                {bgWhen}
              </Text>
              {!!backgroundSyncInfo.message && (
                <Text variant="caption" tone="muted">
                  {backgroundSyncInfo.message}
                </Text>
              )}
            </View>
            <Text
              testID="syncreport.background-outcome"
              variant="caption"
              color={BG_INK[bgOutcome]}
              style={{ fontWeight: '600' }}
            >
              {translate(bgLabel) as string}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
};

export default SyncReport;
