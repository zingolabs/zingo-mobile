/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
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
import CircularProgress from '@ui/primitives/CircularProgress';
import InfoTooltip from '@ui/widgets/InfoTooltip';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import Header from '@ui/widgets/Header';
import { BlocksIcon } from '@ui/primitives/Icons/BlocksIcon';
import { CheckCircleIcon } from '@ui/primitives/Icons/CheckCircleIcon';
import { ClockIcon } from '@ui/primitives/Icons/ClockIcon';
import { HalfCircleIcon } from '@ui/primitives/Icons/HalfCircleIcon';
import { RescanArrows, RescanCloud } from '@ui/primitives/Icons/RescanIcon';
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
const RING_STROKE = 6.5;
const TURN_MS = 700;
const PULSE_MS = 550;
const TL_W = 315;
const TL_H = 88;
const MAP_H = 63;

type SyncReportProps = NativeStackScreenProps<AppDrawerParamList, 'SyncReport'>;

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
}) => {
  const {
    doRescan,
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
  const { percentageOutputsScanned, syncInProgress } = useSyncStatus({
    syncingStatus,
    noSyncingStatus: true,
  });

  const [tip, setTip] = useState(false);
  const [cardW, setCardW] = useState(TL_W);

  const serverTip = info.latestBlock || 0;
  const synced = !syncInProgress && percentageOutputsScanned > 0;
  const pct = synced ? 100 : Math.floor(percentageOutputsScanned);
  const h = heights(syncingStatus, birthday, serverTip, synced);
  const cells = mapCells(syncingStatus, birthday, serverTip, synced);
  const step = phase(syncingStatus, synced);

  const turn = useSharedValue(0);
  const pulse = useSharedValue(1);

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

  const arrowsStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
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

  const startText = translate('sync.sheet-start') as string;
  const [startBefore, startAfter] = startText.split('{n}');
  const rescanRows = (
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
          icon: <HalfCircleIcon />,
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
  );

  return (
    <View
      testID="syncreport"
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
          zIndex: 3,
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
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 16,
            right: 54,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            zIndex: 3,
          }}
        >
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
          <View style={{ margin: -10 }}>
            <CircularProgress
              size={RING}
              strokeWidth={RING_STROKE}
              bgColor={TRACK}
              pgColor={synced ? GREEN : AMBER}
              textSize={14}
              textColor={colors.fgDefault}
              textWeight="bold"
              text={`${pct}%`}
              progressPercent={pct}
            />
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
            {backgroundSyncInfo.error ? null : <CheckCircleIcon />}
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
    </View>
  );
};

export default SyncReport;
