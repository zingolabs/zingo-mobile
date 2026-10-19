/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import Utils from '@app/utils';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { UserPlusIcon } from '@ui/primitives/Icons/UserPlusIcon';
import CurrencyAmount from '@ui/widgets/CurrencyAmount';
import ZecAmount from '@ui/widgets/ZecAmount';
import Header from '@ui/widgets/Header';
import ActivityChart from '@screens/Insight/components/ActivityChart';
import Donut from '@screens/Insight/components/Donut';
import {
  buildInsight,
  Group,
  groupTotal,
  Metric,
  metricOf,
  weekEnd,
} from '@screens/Insight/insightModel';
import { themeTokens } from '@app/theme';

const SIDE = 21.5;
const SOFT_INK = themeTokens.fgMuted;
const HINT_INK = themeTokens.fgMuted;
const CODE_INK = themeTokens.fgDefault;
const ROW_LINE = themeTokens.borderSubtle;
const SELECTED = themeTokens.bgViewOnlySubtle;
const THUMB_BG = themeTokens.bgAccentSubtle;
const THUMB_LINE = themeTokens.borderAccent;
const PRESET_ON_BG = themeTokens.bgViewOnlySubtle;
const PRESET_ON_LINE = themeTokens.borderMuted;
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const SWEEP_MS = 460;
const DEFAULT_WEEKS = 13;
const SEG_W = 212;
const DAY_MS = 24 * 60 * 60 * 1000;

const PRESETS: { weeks: number | 'all'; key: string }[] = [
  { weeks: 4, key: 'insight.preset-4w' },
  { weeks: 13, key: 'insight.preset-3m' },
  { weeks: 26, key: 'insight.preset-6m' },
  { weeks: 'all', key: 'insight.preset-all' },
];

type InsightProps = NativeStackScreenProps<AppDrawerParamList, 'Insight'>;

// What the wallet sent and to whom: weekly activity, the share per recipient
// and the ranked recipients, by amount or by number of sends.
const Insight: React.FunctionComponent<InsightProps> = ({ navigation }) => {
  const {
    translate,
    valueTransfers,
    addressBook,
    zecPrice,
    language,
    info,
    privacy,
    launchAddTagModal,
  } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const insight = buildInsight(valueTransfers ?? [], addressBook, new Date());
  const last = insight.weeks - 1;

  const [metric, setMetric] = useState<Metric>('amount');
  /** The range counts weeks back from the newest, so it keeps its place as sends arrive. */
  const [fromBack, setFromBack] = useState(DEFAULT_WEEKS - 1);
  const [toBack, setToBack] = useState(0);
  const from = Math.max(0, last - fromBack);
  const to = Math.max(from, last - toBack);
  const [selected, setSelected] = useState(-1);
  const [week, setWeek] = useState(-1);
  const [grow, setGrow] = useState(Date.now());
  const sweep = useRef(0);
  const thumb = useSharedValue(0);
  useEffect(() => () => cancelAnimationFrame(sweep.current), []);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumb.value * ((SEG_W - 8) / 2) }],
  }));

  const price = zecPrice.zecPrice;
  const zecText = (zec: number): string =>
    privacy ? '-.----' : Utils.parseNumberFloatToStringLocale(zec, 4);
  const sendsText = (n: number): string =>
    `${n} ${translate(n === 1 ? 'insight.send' : 'insight.sends-unit') as string}`;
  const value = (v: number): string =>
    metric === 'amount' ? zecText(v) : sendsText(v);
  const day = (date: Date) =>
    Utils.formatDate(date.getTime(), 'MMM d', language);
  const weekStart = (w: number) =>
    new Date(weekEnd(insight, w).getTime() - 6 * DAY_MS);
  const rangeLabel = (w: number) =>
    `${day(weekStart(w))} – ${day(weekEnd(insight, w))}`;
  const name = (group: Group): string =>
    group.kind === 'others'
      ? (translate('insight.others') as string)
      : group.name || Utils.trimToSmall(group.address, 7);

  const pickMetric = (next: Metric) => {
    if (next === metric) {
      return;
    }
    thumb.value = withTiming(next === 'amount' ? 0 : 1, {
      duration: 260,
      easing: ease.emphasized,
      reduceMotion: ReduceMotion.System,
    });
    setMetric(next);
    setSelected(-1);
    setWeek(-1);
    setGrow(Date.now());
  };

  const goTo = (a: number, b: number) => {
    cancelAnimationFrame(sweep.current);
    setWeek(-1);
    const a0 = from;
    const b0 = to;
    const t0 = Date.now();
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / SWEEP_MS);
      const e = 1 - Math.pow(1 - k, 3);
      setFromBack(last - Math.round(a0 + (a - a0) * e));
      setToBack(last - Math.round(b0 + (b - b0) * e));
      if (k < 1) {
        sweep.current = requestAnimationFrame(step);
      }
    };
    sweep.current = requestAnimationFrame(step);
  };

  const groups = insight.groups.map((group, g) => ({
    group,
    g,
    total: groupTotal(insight, g, from, to),
  }));
  const slices = groups
    .map(x => ({
      g: x.g,
      value: metricOf(x.total, metric),
      color: x.group.color,
    }))
    .filter(s => s.value > 0);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const focus = slices.find(s => s.g === selected);
  const centerAmount = focus ? focus.value : total;
  const center =
    slices.length > 0 && metric === 'amount' ? (
      <>
        <ZecAmount
          testID="insight.donut.value"
          currencyName={info.currencyName}
          size={20}
          amtZec={centerAmount}
          privacy={privacy}
        />
        {price > 0 && (
          <CurrencyAmount
            price={price}
            amtZec={centerAmount}
            privacy={privacy}
            style={{ fontSize: 13, fontWeight: '600', color: CODE_INK }}
          />
        )}
      </>
    ) : (
      <Text
        testID="insight.donut.value"
        style={{
          color: colors.fgDefault,
          fontSize: 22,
          lineHeight: 26,
          fontWeight: '700',
        }}
      >
        {slices.length === 0
          ? (translate('insight.nothing') as string)
          : String(centerAmount)}
      </Text>
    );
  const caption =
    slices.length === 0
      ? (translate('insight.in-range') as string)
      : focus
        ? `${name(insight.groups[focus.g])} · ${Math.round((focus.value / total) * 100)}%`
        : (translate(
            metric === 'amount'
              ? 'insight.zec-in-range'
              : 'insight.sends-in-range',
          ) as string);
  const ranked = [...slices].sort((x, y) => y.value - x.value);
  const span = to - from + 1;
  const card = {
    marginTop: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.bottomSheetBorder,
    backgroundColor: colors.bgSurface,
  };
  const cardHead = (title: string, right?: React.ReactNode) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 24,
      }}
    >
      <Text
        style={{ color: colors.fgDefault, fontSize: 15, fontWeight: '700' }}
      >
        {title}
      </Text>
      {right}
    </View>
  );

  return (
    <View
      testID="insight"
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
          testID="insight.back"
          accessibilityRole="button"
          accessibilityLabel={translate('insight.back-acc') as string}
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            position: 'absolute',
            left: 10,
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? themeTokens.bgMutedSubtle : undefined,
          })}
        >
          <ChevronLeft size={24} color={colors.fgAccent} />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={{ color: colors.fgDefault, fontSize: 18, fontWeight: '700' }}
        >
          {translate('insight.title') as string}
        </Text>
      </View>

      <ScrollView
        testID="insight.scroll-view"
        contentContainerStyle={{ paddingHorizontal: SIDE, paddingBottom: 36 }}
      >
        <View
          accessibilityRole="tablist"
          style={{
            alignSelf: 'center',
            width: SEG_W,
            height: 36,
            marginTop: 2,
            padding: 3,
            flexDirection: 'row',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            backgroundColor: colors.bgSurface,
          }}
        >
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 3,
                bottom: 3,
                left: 3,
                width: (SEG_W - 8) / 2,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: THUMB_LINE,
                backgroundColor: THUMB_BG,
              },
              thumbStyle,
            ]}
          />
          {(['amount', 'sends'] as Metric[]).map(m => (
            <Pressable
              key={m}
              testID={`insight.metric.${m}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: metric === m }}
              onPress={() => pickMetric(m)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: metric === m ? colors.fgDefault : SOFT_INK,
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {translate(`insight.metric-${m}`) as string}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={card}>
          {cardHead(
            translate('insight.activity') as string,
            (from > 0 || to < last) && (
              <Pressable
                testID="insight.zoom-out"
                accessibilityRole="button"
                onPress={() => goTo(0, last)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                  height: 30,
                  marginRight: -6,
                  paddingHorizontal: 8,
                  borderRadius: 8,
                }}
              >
                <ChevronLeft size={16} color={colors.fgAccent} />
                <Text
                  style={{
                    color: colors.fgAccent,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  {translate('insight.zoom-out') as string}
                </Text>
              </Pressable>
            ),
          )}
          <Text
            style={{
              marginTop: 2,
              marginBottom: 8,
              color: SOFT_INK,
              fontSize: 12,
            }}
          >
            {`${day(weekStart(from))} – ${Utils.formatDate(
              weekEnd(insight, to).getTime(),
              'MMM d, yyyy',
              language,
            )}`}
          </Text>
          <ActivityChart
            insight={insight}
            metric={metric}
            from={from}
            to={to}
            grow={grow}
            week={week}
            onWeek={setWeek}
            name={name}
            dayLabel={w => day(weekEnd(insight, w))}
            rangeLabel={rangeLabel}
            value={value}
            totalLabel={translate('insight.total') as string}
            noneLabel={translate('insight.no-sends') as string}
          />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {PRESETS.map(p => {
              const n =
                p.weeks === 'all'
                  ? insight.weeks
                  : Math.min(p.weeks, insight.weeks);
              const on = to === last && span === n;
              return (
                <Pressable
                  key={p.key}
                  testID={`insight.${p.key.split('.')[1]}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => !on && goTo(insight.weeks - n, last)}
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 10,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderColor: on ? PRESET_ON_LINE : colors.bottomSheetBorder,
                    backgroundColor: on ? PRESET_ON_BG : undefined,
                  }}
                >
                  <Text
                    style={{
                      color: on ? colors.fgDefault : SOFT_INK,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {translate(p.key) as string}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={card}>
          {cardHead(translate('insight.where') as string)}
          <Donut
            slices={slices}
            selected={selected}
            onSelect={setSelected}
            center={center}
            caption={caption}
          />
        </View>

        <View style={[card, { paddingBottom: 22 }]}>
          {cardHead(
            translate('insight.recipients') as string,
            <Text style={{ color: HINT_INK, fontSize: 12 }}>
              {translate('insight.recipients-hint') as string}
            </Text>,
          )}
          {ranked.length === 0 && (
            <Text
              testID="insight.empty"
              style={{
                marginVertical: 22,
                marginHorizontal: 10,
                textAlign: 'center',
                color: SOFT_INK,
                fontSize: 13,
              }}
            >
              {translate('insight.empty') as string}
            </Text>
          )}
          <View style={{ marginTop: 6, marginHorizontal: -6 }}>
            {ranked.map((s, i) => {
              const group = insight.groups[s.g];
              const t = groups[s.g].total;
              const share = s.value / total;
              const on = selected === s.g;
              const canAdd = group.kind === 'recipient' && !group.contact;
              return (
                <Pressable
                  key={s.g}
                  testID={`insight.row.${s.g}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setSelected(on ? -1 : s.g)}
                  style={{
                    paddingVertical: 11,
                    paddingHorizontal: 6,
                    borderRadius: 12,
                    borderTopLeftRadius: i === 0 ? 12 : 0,
                    borderTopRightRadius: i === 0 ? 12 : 0,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: ROW_LINE,
                    backgroundColor: on ? SELECTED : undefined,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${group.color}29`,
                      }}
                    >
                      <Text
                        style={{
                          color: group.color,
                          fontSize: 15,
                          fontWeight: '700',
                        }}
                      >
                        {group.kind === 'others'
                          ? `+${group.count}`
                          : group.name
                            ? group.name.slice(0, 1).toUpperCase()
                            : '#'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: colors.fgDefault,
                          fontSize:
                            group.kind === 'recipient' && !group.name
                              ? 12.5
                              : 13.5,
                          lineHeight: 18,
                          fontWeight:
                            group.kind === 'recipient' && !group.name
                              ? '500'
                              : '600',
                          fontFamily:
                            group.kind === 'recipient' && !group.name
                              ? MONO
                              : undefined,
                        }}
                      >
                        {name(group)}
                      </Text>
                      <View
                        style={{
                          height: 5,
                          marginTop: 6,
                          borderRadius: 3,
                          overflow: 'hidden',
                          backgroundColor: ROW_LINE,
                        }}
                      >
                        <View
                          style={{
                            width: `${share * 100}%`,
                            height: '100%',
                            borderRadius: 3,
                            backgroundColor: group.color,
                          }}
                        />
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {metric === 'amount' ? (
                        <ZecAmount
                          testID={`insight.row.${s.g}.value`}
                          currencyName={info.currencyName}
                          size={13}
                          amtZec={s.value}
                          privacy={privacy}
                          smallPrefix
                        />
                      ) : (
                        <Text
                          style={{
                            color: colors.fgDefault,
                            fontSize: 13,
                            lineHeight: 18,
                            fontWeight: '700',
                          }}
                        >
                          {sendsText(s.value)}
                        </Text>
                      )}
                      <View
                        style={{ flexDirection: 'row', alignItems: 'baseline' }}
                      >
                        <Text
                          style={{
                            color: SOFT_INK,
                            fontSize: 12,
                            lineHeight: 16,
                          }}
                        >
                          {`${Math.round(share * 100)}%${price > 0 ? ' · ' : ''}`}
                        </Text>
                        {price > 0 && (
                          <CurrencyAmount
                            price={price}
                            amtZec={t.amount}
                            privacy={privacy}
                            style={{
                              fontSize: 12,
                              fontWeight: '400',
                              color: SOFT_INK,
                            }}
                          />
                        )}
                      </View>
                    </View>
                    {canAdd && (
                      <Pressable
                        testID={`insight.row.${s.g}.add`}
                        accessibilityRole="button"
                        accessibilityLabel={
                          translate('insight.add-contact') as string
                        }
                        onPress={() => launchAddTagModal(group.address)}
                        style={({ pressed }) => ({
                          width: 36,
                          height: 36,
                          marginRight: -6,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: pressed
                            ? themeTokens.bgAccentSubtle
                            : undefined,
                        })}
                      >
                        <UserPlusIcon size={20} color={themeTokens.fgAccent} />
                      </Pressable>
                    )}
                  </View>
                  {on && (
                    <Text
                      testID={`insight.row.${s.g}.detail`}
                      style={{
                        marginTop: 8,
                        marginLeft: 48,
                        color: SOFT_INK,
                        fontSize: 12,
                        lineHeight: 17,
                      }}
                    >
                      {`${sendsText(t.sends)} · ZEC ${zecText(t.amount)} · ${t.bytes.toLocaleString('en-US')} ${translate('insight.bytes') as string}`}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Insight;
