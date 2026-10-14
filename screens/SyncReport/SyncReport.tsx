/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Keyframe,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ScreenEnum, RouteEnum, SnackbarDurationEnum } from '@app/AppState';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { useSyncStatus } from '@app/hooks/useSyncStatus';
import { createAlert } from '@app/services/createAlert';
import { sendEmail } from '@app/services/sendEmail';
import {
  enactGateAnswer,
  resolveTriggerGate,
} from '@app/services/gateController';
import Utils from '@app/utils';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import Header from '@ui/widgets/Header';
import {
  BlocksIcon,
  ClockIcon,
  HalfIcon,
  OkCircleIcon,
  RescanArrows,
  RescanCloud,
} from '@screens/SyncReport/components/SyncIcons';
import {
  CellState,
  heights,
  MAP_COLS,
  MAP_ROWS,
  mapCells,
  phase,
  Phase,
  scaleMax,
} from '@screens/SyncReport/syncModel';

const SIDE = 21.5;
const SOFT_INK = '#8DA0B8';
const CODE_INK = '#B9C6D6';
const AXIS_INK = '#7D93B3';
const OK_INK = '#7FD96E';
const RED_INK = '#F2878A';
const GREEN = '#3CC52A';
const AMBER = '#E6B43C';
const BLUE = '#8FB4E6';
const TRACK = '#0A1F3D';
const TILE_BG = '#052520';
const INFO_BG = '#A8B3C4';
const INFO_INK = '#060B12';
const ARROW_HALF = 6;

const CELL_COLOR: Record<CellState, string> = {
  scanned: GREEN,
  scanning: AMBER,
  refetching: '#F7931A',
  high: '#5B8DEF',
  low: '#3A4A62',
};

const PHASE_KEY: Record<Phase, string> = {
  done: 'sync.all-scanned',
  verifying: 'sync.phase-verifying',
  tip: 'sync.phase-tip',
  notes: 'sync.phase-notes',
  historic: 'sync.phase-historic',
};

const LEGEND: { state: CellState; key: string }[] = [
  { state: 'scanned', key: 'sync.legend-scanned' },
  { state: 'scanning', key: 'sync.legend-scanning' },
  { state: 'refetching', key: 'sync.legend-refetching' },
  { state: 'high', key: 'sync.legend-high' },
  { state: 'low', key: 'sync.legend-low' },
];

const RING = 76;
const RING_R = 58;
const RING_W = 12;
const RING_C = 2 * Math.PI * RING_R;
const RING_FILL_MS = 900;
const RING_FILL_AT = 200;
const TURN_MS = 700;
const PULSE_MS = 550;
const TIP_W = 236;
const TL_W = 315;
const TL_H = 88;
const MAP_H = 63;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const tipEnter = () =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: -4 }, { scale: 0.94 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
  })
    .duration(180)
    .reduceMotion(ReduceMotion.System);
const tipExit = () =>
  new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    100: { opacity: 0, transform: [{ translateY: -2 }, { scale: 0.97 }] },
  })
    .duration(120)
    .reduceMotion(ReduceMotion.System);

type SyncReportProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.SyncReport
> & {
  doRescan: () => Promise<void>;
};

const nf = (n: number): string => n.toLocaleString('en-US');

const fill = (text: string, values: Record<string, string>): string =>
  Object.entries(values).reduce(
    (out, [key, value]) => out.replace(`{${key}}`, value),
    text,
  );

// The sync report: progress ring, heights, the blocks timeline, the scanning
// map and the last background sync, with the rescan in the header.
const SyncReport: React.FunctionComponent<SyncReportProps> = ({
  navigation,
  doRescan,
}) => {
  const {
    syncingStatus,
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
    setBackgroundSyncErrorInfo,
  } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const window = useWindowDimensions();
  const { percentageOutputsScanned, syncInProgress } = useSyncStatus({
    syncingStatus,
    noSyncingStatus: true,
  });

  const [tip, setTip] = useState(false);
  const [rowTop, setRowTop] = useState(0);
  const [cardW, setCardW] = useState(TL_W);
  const sheet = useRef<BottomSheetModal>(null);

  const serverTip = info.latestBlock || 0;
  const synced = !syncInProgress && percentageOutputsScanned > 0;
  const pct = synced ? 100 : Math.floor(percentageOutputsScanned);
  const h = heights(syncingStatus, birthday, serverTip, synced);
  const cells = mapCells(syncingStatus, birthday, serverTip, synced);
  const step = phase(syncingStatus, synced);

  const arc = useSharedValue(0);
  const turn = useSharedValue(0);
  const pulse = useSharedValue(1);
  const infoTurn = useSharedValue(0);

  useEffect(() => {
    arc.value = withDelay(
      RING_FILL_AT,
      withTiming(pct / 100, {
        duration: RING_FILL_MS,
        easing: ease.out,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [pct, arc]);

  useEffect(() => {
    pulse.value = syncInProgress
      ? withRepeat(
          withSequence(
            withTiming(0.45, { duration: PULSE_MS }),
            withTiming(1, { duration: PULSE_MS }),
          ),
          -1,
        )
      : withTiming(1, { duration: PULSE_MS });
  }, [syncInProgress, pulse]);

  const arcProps = useAnimatedProps(() => ({
    strokeDasharray: [Math.max(0.1, RING_C * arc.value), RING_C],
  }));
  const arrowsStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
  }));
  const rescanStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const infoStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${infoTurn.value}deg` }],
  }));

  const openRescan = () => {
    setTip(false);
    turn.value = 0;
    turn.value = withTiming(360, {
      duration: TURN_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.System,
    });
    sheet.current?.present();
  };

  const toggleTip = () => {
    if (!tip) {
      infoTurn.value = 0;
      infoTurn.value = withTiming(360, {
        duration: 260,
        easing: ease.spring,
        reduceMotion: ReduceMotion.System,
      });
    }
    setTip(!tip);
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
    sheet.current?.dismiss();
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
    setBackgroundSyncErrorInfo('');
  };

  const card = {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
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
        marginBottom: 10,
      }}
    >
      <Text
        style={{ color: colors.fgDefault, fontSize: 15, fontWeight: '700' }}
      >
        {title}
      </Text>
      <Text style={{ color: SOFT_INK, fontSize: 11.5 }}>{note}</Text>
    </View>
  );

  const status = synced
    ? (translate('sync.synced') as string)
    : (translate('sync.syncing') as string);
  const sub = !netInfo.isConnected
    ? (translate('sync.offline') as string)
    : synced
      ? fill(translate('sync.both-at') as string, { tip: nf(serverTip) })
      : fill(translate('sync.at') as string, {
          wallet: nf(h.wallet),
          tip: nf(serverTip),
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
  const bgWhen =
    timeOf(bgStart, 'MMM d, yyyy · h:mm:ss') +
    (bgEnd > 0 && bgEnd !== bgStart
      ? ' – ' +
        timeOf(bgEnd, bgSameDay ? 'h:mm:ss aaa' : 'MMM d, yyyy · h:mm:ss aaa')
      : '');

  const tipLeft = Math.min(
    Math.max(window.width - 65 - TIP_W / 2, 16),
    window.width - TIP_W - 16,
  );
  const startText = translate('sync.sheet-start') as string;
  const [startBefore, startAfter] = startText.split('{n}');

  return (
    <View
      testID="syncreport"
      style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 4 }}
    >
      <Header
        title={''}
        screenName={ScreenEnum.SyncReport}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
      />
      <View
        onLayout={e => setRowTop(e.nativeEvent.layout.y)}
        style={{
          height: 44,
          marginTop: 6,
          marginBottom: 10,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Pressable
          testID="syncreport.back"
          accessibilityRole="button"
          accessibilityLabel={translate('sync.back-acc') as string}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            position: 'absolute',
            left: 10,
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : undefined,
          })}
        >
          <ChevronLeft size={22} color={colors.fgAccent} strokeWidth={2.2} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={{ color: colors.fgDefault, fontSize: 18, fontWeight: '700' }}
        >
          {translate('sync.title') as string}
        </Text>
        <Pressable
          testID="syncreport.info"
          accessibilityRole="button"
          accessibilityLabel={translate('sync.info-acc') as string}
          accessibilityState={{ expanded: tip }}
          hitSlop={12}
          onPress={toggleTip}
          style={{ position: 'absolute', right: 58 }}
        >
          <Animated.View
            style={[
              {
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: INFO_BG,
                alignItems: 'center',
                justifyContent: 'center',
              },
              infoStyle,
            ]}
          >
            <Text
              style={{
                color: INFO_INK,
                fontSize: 9.5,
                lineHeight: 14,
                fontWeight: '700',
              }}
            >
              i
            </Text>
          </Animated.View>
        </Pressable>
        <Pressable
          testID="syncreport.rescan"
          accessibilityRole="button"
          accessibilityLabel={translate('sync.rescan-acc') as string}
          onPress={openRescan}
          style={({ pressed }) => ({
            position: 'absolute',
            right: 10,
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : undefined,
          })}
        >
          <Animated.View style={[{ width: 25, height: 25 }, rescanStyle]}>
            <RescanCloud size={25} />
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  transformOrigin: '79.2% 72.9%',
                },
                arrowsStyle,
              ]}
            >
              <RescanArrows size={25} />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>

      <ScrollView
        testID="syncreport.scroll-view"
        onTouchStart={() => tip && setTip(false)}
        contentContainerStyle={{ paddingHorizontal: SIDE, paddingBottom: 28 }}
      >
        <View
          style={[
            card,
            {
              marginTop: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            },
          ]}
        >
          <View style={{ width: RING, height: RING }}>
            <Svg width={RING} height={RING} viewBox="0 0 140 140">
              <Circle
                cx={70}
                cy={70}
                r={RING_R}
                fill="none"
                stroke={TRACK}
                strokeWidth={RING_W}
              />
              <AnimatedCircle
                cx={70}
                cy={70}
                r={RING_R}
                fill="none"
                stroke={synced ? GREEN : AMBER}
                strokeWidth={RING_W}
                strokeLinecap="round"
                transform="rotate(-90 70 70)"
                animatedProps={arcProps}
              />
            </Svg>
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                testID="syncreport.percent"
                style={{
                  color: colors.fgDefault,
                  fontSize: 14,
                  lineHeight: 18,
                  fontWeight: '700',
                }}
              >
                {`${pct}%`}
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              testID="syncreport.status"
              style={{
                color: colors.fgDefault,
                fontSize: 14,
                fontWeight: '600',
              }}
            >
              {status}
            </Text>
            <Text
              style={{
                marginTop: 2,
                color: SOFT_INK,
                fontSize: 11.5,
                lineHeight: 16,
              }}
            >
              {sub}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {[
            { key: 'sync.server', dot: BLUE, value: h.server },
            { key: 'sync.wallet', dot: GREEN, value: h.wallet },
            { key: 'sync.behind', dot: AMBER, value: h.behind },
          ].map(t => (
            <View
              key={t.key}
              testID={`syncreport.${t.key.split('.')[1]}`}
              style={[card, { flex: 1, marginTop: 0, padding: 12 }]}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 3,
                    backgroundColor: t.dot,
                  }}
                />
                <Text style={{ color: SOFT_INK, fontSize: 11.5 }}>
                  {translate(t.key) as string}
                </Text>
              </View>
              <Text
                style={{
                  marginTop: 6,
                  color: colors.fgDefault,
                  fontSize: 13.5,
                  fontWeight: '700',
                }}
              >
                {nf(t.value)}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={card}
          onLayout={e => setCardW(e.nativeEvent.layout.width - 34)}
        >
          {cardHead(
            translate('sync.blocks') as string,
            fill(translate('sync.scanned-n') as string, { n: nf(h.scanned) }),
          )}
          <Svg
            width={cardW}
            height={(TL_H * cardW) / TL_W}
            viewBox={`0 0 ${TL_W} ${TL_H}`}
          >
            <Rect x={0} y={22} width={TL_W} height={14} rx={7} fill={TRACK} />
            <Rect x={0} y={22} width={xTip} height={14} rx={7} fill={BLUE} />
            {ticks.map((v, i) => (
              <SvgText
                key={v}
                x={i === 0 ? 0 : x(v)}
                y={12}
                fontSize={10}
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
            />
            <Path d={`M${x0} 42V54`} stroke={GREEN} strokeWidth={1.5} />
            <SvgText
              x={birthdayLeft ? x0 + 5 : x0 - 5}
              y={58}
              fontSize={10}
              fill={CODE_INK}
              textAnchor={birthdayLeft ? 'start' : 'end'}
            >
              {fill(translate('sync.birthday-at') as string, {
                n: nf(birthday),
              })}
            </SvgText>
            <Path d={`M${xTip} 42V68`} stroke={BLUE} strokeWidth={1.5} />
            <SvgText
              x={xTip - 5}
              y={76}
              fontSize={10}
              fill={CODE_INK}
              textAnchor="end"
            >
              {fill(translate('sync.tip-at') as string, { n: nf(serverTip) })}
            </SvgText>
          </Svg>
        </View>

        <View style={card}>
          {cardHead(
            translate('sync.map') as string,
            step === 'done'
              ? (translate(PHASE_KEY.done) as string)
              : `${translate(PHASE_KEY[step]) as string} · ${pct}%`,
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
              rowGap: 6,
              columnGap: 14,
              marginTop: 12,
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
                    borderRadius: 3,
                    backgroundColor: CELL_COLOR[l.state],
                  }}
                />
                <Text style={{ color: SOFT_INK, fontSize: 11 }}>
                  {translate(l.key) as string}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {bgStart > 0 && (
          <Pressable
            testID="syncreport.background"
            disabled={!backgroundSyncInfo.error}
            onPress={reportError}
            style={[
              card,
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 14,
              },
            ]}
          >
            {backgroundSyncInfo.error ? null : <OkCircleIcon />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  color: colors.fgDefault,
                  fontSize: 13,
                  lineHeight: 18,
                  fontWeight: '600',
                }}
              >
                {translate('sync.last-background') as string}
              </Text>
              <Text style={{ color: SOFT_INK, fontSize: 11.5, lineHeight: 16 }}>
                {bgWhen}
              </Text>
              {!!backgroundSyncInfo.message && (
                <Text
                  style={{ color: SOFT_INK, fontSize: 11.5, lineHeight: 16 }}
                >
                  {backgroundSyncInfo.message}
                </Text>
              )}
            </View>
            <Text
              style={{
                color: backgroundSyncInfo.error ? RED_INK : OK_INK,
                fontSize: 11.5,
                fontWeight: '600',
              }}
            >
              {
                translate(
                  backgroundSyncInfo.error ? 'view-error' : 'sync.finished-ok',
                ) as string
              }
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {tip && (
        <Animated.View
          testID="syncreport.tip"
          entering={tipEnter()}
          exiting={tipExit()}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: rowTop + 22 + 7 + 10,
            left: tipLeft,
            width: TIP_W,
            paddingHorizontal: 12,
            paddingTop: 9,
            paddingBottom: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            backgroundColor: colors.bgSurface,
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: -ARROW_HALF,
              left: window.width - 65 - tipLeft - 5,
              width: 10,
              height: 10,
              borderLeftWidth: 1,
              borderTopWidth: 1,
              borderColor: colors.bottomSheetBorder,
              backgroundColor: colors.bgSurface,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <Text
            style={{
              color: colors.fgDefault,
              fontSize: 10.5,
              lineHeight: 14,
              fontWeight: '600',
              marginBottom: 3,
            }}
          >
            {translate('sync.tip-title') as string}
          </Text>
          <Text style={{ color: colors.fgMuted, fontSize: 10, lineHeight: 13 }}>
            {translate('sync.tip-text') as string}
          </Text>
        </Animated.View>
      )}

      <AppSheetModal
        ref={sheet}
        header={
          <Text
            accessibilityRole="header"
            style={{
              marginTop: 10,
              textAlign: 'center',
              color: colors.fgDefault,
              fontSize: 15.5,
              lineHeight: 21,
              fontWeight: '700',
            }}
          >
            {translate('sync.sheet-title') as string}
          </Text>
        }
        contentStyle={{ paddingHorizontal: 22, paddingBottom: 34 }}
      >
        <Text
          style={{
            marginTop: 6,
            textAlign: 'center',
            color: SOFT_INK,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {translate('sync.sheet-sub') as string}
        </Text>
        <View style={{ marginTop: 10 }}>
          {[
            {
              icon: <BlocksIcon />,
              text: (
                <Text>
                  {startBefore}
                  <Text style={{ fontWeight: '700' }}>{nf(birthday)}</Text>
                  {startAfter}
                </Text>
              ),
            },
            {
              icon: <ClockIcon />,
              text: translate('sync.sheet-time') as string,
            },
            {
              icon: <HalfIcon />,
              text: translate('sync.sheet-incomplete') as string,
            },
          ].map((row, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 13,
                paddingHorizontal: 4,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.bottomSheetBorder,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  backgroundColor: TILE_BG,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {row.icon}
              </View>
              <Text
                style={{
                  flex: 1,
                  color: colors.fgDefault,
                  fontSize: 12,
                  lineHeight: 17,
                }}
              >
                {row.text}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          testID="syncreport.rescan-go"
          accessibilityRole="button"
          onPress={rescan}
          style={({ pressed }) => ({
            height: 46,
            marginTop: 20,
            borderRadius: 23,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.bgAccent,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text
            style={{ color: colors.bgCanvas, fontSize: 15, fontWeight: '700' }}
          >
            {translate('sync.rescan') as string}
          </Text>
        </Pressable>
        <Pressable
          testID="syncreport.rescan-cancel"
          accessibilityRole="button"
          onPress={() => sheet.current?.dismiss()}
          style={({ pressed }) => ({
            minHeight: 38,
            marginTop: 8,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: SOFT_INK, fontSize: 13, fontWeight: '500' }}>
            {translate('cancel') as string}
          </Text>
        </Pressable>
      </AppSheetModal>
    </View>
  );
};

export default SyncReport;
