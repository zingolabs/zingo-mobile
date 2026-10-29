/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  iconSizeMd,
  radiusMd,
  radiusPill,
  slopFor,
  space8,
  space12,
  space16,
  space20,
  space32,
  textVariants,
  useTheme,
} from '@app/theme';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import Chip from '@ui/primitives/Chip';
import { ease } from '@app/theme/motion';
import Pressable from '@ui/primitives/Pressable';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { formatAmount, formatInteger } from '@app/utils/formatAmount';
import { MASK, useAmountReveal } from '@ui/widgets/PrivateAmount';
import Utils from '@app/utils';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { UserPlusIcon } from '@ui/primitives/Icons/UserPlusIcon';
import AddressText from '@ui/primitives/Text';
import CurrencyAmount from '@ui/widgets/CurrencyAmount';
import ZecAmount from '@ui/widgets/ZecAmount';
import Header from '@ui/widgets/Header';
import ActivityChart from '@screens/Insight/components/ActivityChart';
import Donut from '@screens/Insight/components/Donut';
import { useTimedReveal } from '@app/hooks/useTimedReveal';
import { mask } from '@app/utils/reveal';
import {
  buildInsight,
  Group,
  groupTotal,
  Metric,
  metricOf,
  weekEnd,
} from '@screens/Insight/insightModel';
import { themeTokens } from '@app/theme';

const SIDE = space20;
const SOFT_INK = themeTokens.fgMuted;
const CODE_INK = themeTokens.fgDefault;
const ROW_LINE = themeTokens.borderSubtle;
const THUMB_BG = themeTokens.bgAccentSubtle;
const THUMB_LINE = themeTokens.borderAccent;
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

/** The address of a row, masked in privacy mode until a tap reveals it for the reveal time. */
function RowAddress({
  address,
  privacy,
}: {
  address: string;
  privacy: boolean;
}) {
  const { translate } = useContext(ContextAppLoaded);
  const { visible, reveal } = useTimedReveal(privacy);
  const body = (
    <AddressText variant="address" numberOfLines={1}>
      {visible ? Utils.trimToSmall(address, 7) : mask(address)}
    </AddressText>
  );
  return visible ? (
    body
  ) : (
    <Pressable
      kind="link"
      accessibilityRole="button"
      accessibilityLabel={translate('insight.reveal-address') as string}
      onPress={reveal}
      hitSlop={8}
    >
      {body}
    </Pressable>
  );
}

// What the wallet sent and to whom: weekly activity, the share per recipient
// and the ranked recipients, by amount or by number of sends.
const Insight: React.FunctionComponent<InsightProps> = ({ navigation }) => {
  const { colors: palette } = useTheme();
  /** A category's subtle tint, for the avatar behind its initial. */
  const tintOf = (color: string): string => {
    const i = [1, 2, 3, 4, 5].find(
      n => palette[`fgCategory${n}` as keyof typeof palette] === color,
    );
    return i
      ? palette[`bgCategory${i}` as keyof typeof palette]
      : palette.bgMutedSubtle;
  };
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
  /** One reveal for the screen; shares give amounts away, sends counts do not. */
  const amounts = useAmountReveal();
  const sharesHidden = metric === 'amount' && amounts.hidden;
  const percent = (share: number): string =>
    sharesHidden ? `${MASK}%` : `${Math.round(share * 100)}%`;
  const zecText = (zec: number): string => amounts.show(formatAmount(zec));
  const onAmount = amounts.hidden ? amounts.reveal : undefined;
  const sendsText = (n: number): string =>
    `${formatInteger(n)} ${translate(n === 1 ? 'insight.send' : 'insight.sends-unit') as string}`;
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
      : group.name ||
        (privacy ? mask(group.address) : Utils.trimToSmall(group.address, 7));

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
            style={{
              fontSize: textVariants.bodySmall.fontSize,
              fontWeight: '600',
              color: CODE_INK,
            }}
          />
        )}
      </>
    ) : (
      <Text testID="insight.donut.value" variant="screenTitle">
        {slices.length === 0
          ? (translate('insight.nothing') as string)
          : String(centerAmount)}
      </Text>
    );
  const caption =
    slices.length === 0
      ? (translate('insight.in-range') as string)
      : focus
        ? `${name(insight.groups[focus.g])} · ${percent(focus.value / total)}`
        : (translate(
            metric === 'amount'
              ? 'insight.zec-in-range'
              : 'insight.sends-in-range',
          ) as string);
  const ranked = [...slices].sort((x, y) => y.value - x.value);
  const span = to - from + 1;
  const card = {
    marginTop: space16,
    padding: space16,
    borderRadius: radiusMd,
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
      <Text variant="bodyStrong">{title}</Text>
      {right}
    </View>
  );

  return (
    <View
      testID="insight"
      style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 4 }}
    >
      <Header
        title={translate('insight.title') as string}
        closeScreen={() => navigation.goBack()}
        backTestID="insight.back"
        backAccessibilityLabel={translate('insight.back-acc') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
      />
      <ScrollView
        testID="insight.scroll-view"
        contentContainerStyle={{
          paddingHorizontal: SIDE,
          paddingBottom: space32,
        }}
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
            borderRadius: radiusPill,
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
                borderRadius: radiusPill,
                borderWidth: 1,
                borderColor: THUMB_LINE,
                backgroundColor: THUMB_BG,
              },
              thumbStyle,
            ]}
          />
          {(['amount', 'sends'] as Metric[]).map(m => (
            <Pressable
              kind="button"
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
                variant="bodySmall"
                tone={metric === m ? 'default' : 'muted'}
                style={{ fontWeight: '600' }}
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
              <Button
                testID="insight.zoom-out"
                variant="text"
                size="small"
                inline
                icon={ChevronLeft}
                title={translate('insight.zoom-out') as string}
                onPress={() => goTo(0, last)}
              />
            ),
          )}
          <Text variant="caption" tone="muted" style={{ marginBottom: space8 }}>
            {`${day(weekStart(from))} – ${Utils.formatDate(
              weekEnd(insight, to).getTime(),
              'MMM d, yyyy',
              language,
            )}`}
          </Text>
          <ActivityChart
            masked={sharesHidden}
            onReveal={onAmount}
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
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: space8,
              marginTop: space12,
            }}
          >
            {PRESETS.map(p => {
              const n =
                p.weeks === 'all'
                  ? insight.weeks
                  : Math.min(p.weeks, insight.weeks);
              /** A preset as long as the history or longer is All: only All lights. */
              const covered = p.weeks !== 'all' && p.weeks >= insight.weeks;
              const on = to === last && span === n && !covered;
              return (
                <Chip
                  grow
                  key={p.key}
                  testID={`insight.${p.key.split('.')[1]}`}
                  selected={on}
                  onPress={() => !on && goTo(insight.weeks - n, last)}
                >
                  {translate(p.key) as string}
                </Chip>
              );
            })}
          </View>
        </View>

        <View style={card}>
          {cardHead(translate('insight.where') as string)}
          <Donut
            masked={sharesHidden}
            onReveal={onAmount}
            slices={slices}
            selected={selected}
            onSelect={setSelected}
            center={center}
            caption={caption}
          />
        </View>

        <View style={[card, { paddingBottom: space20 }]}>
          {cardHead(
            translate('insight.recipients') as string,
            <Text variant="caption" tone="muted">
              {translate('insight.recipients-hint') as string}
            </Text>,
          )}
          {ranked.length === 0 && (
            <Text
              testID="insight.empty"
              variant="body"
              tone="muted"
              style={{ marginVertical: space20, textAlign: 'center' }}
            >
              {translate('insight.empty') as string}
            </Text>
          )}
          <View style={{ marginTop: space8, marginHorizontal: -space8 }}>
            {ranked.map((s, i) => {
              const group = insight.groups[s.g];
              const t = groups[s.g].total;
              const share = s.value / total;
              const on = selected === s.g;
              const canAdd = group.kind === 'recipient' && !group.contact;
              return (
                <Pressable
                  kind="row"
                  key={s.g}
                  testID={`insight.row.${s.g}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setSelected(on ? -1 : s.g)}
                  style={{
                    paddingVertical: space12,
                    paddingHorizontal: space8,
                    borderRadius: radiusMd,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: ROW_LINE,
                    backgroundColor: on ? colors.bgAccentSubtle : undefined,
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
                        borderRadius: radiusPill,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: tintOf(group.color),
                      }}
                    >
                      <Text
                        variant="bodyStrong"
                        color={group.color}
                        style={{ fontWeight: '700' }}
                      >
                        {group.kind === 'others'
                          ? `+${group.count}`
                          : group.name
                            ? group.name.slice(0, 1).toUpperCase()
                            : '#'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {group.kind === 'recipient' && !group.name ? (
                        <RowAddress address={group.address} privacy={privacy} />
                      ) : (
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {name(group)}
                        </Text>
                      )}
                      <View
                        style={{
                          height: 5,
                          marginTop: space8,
                          borderRadius: radiusPill,
                          overflow: 'hidden',
                          backgroundColor: ROW_LINE,
                        }}
                      >
                        <View
                          style={{
                            width: `${share * 100}%`,
                            height: '100%',
                            borderRadius: radiusPill,
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
                        <Text variant="bodySmall" style={{ fontWeight: '700' }}>
                          {sendsText(s.value)}
                        </Text>
                      )}
                      <View
                        style={{ flexDirection: 'row', alignItems: 'baseline' }}
                      >
                        <Text variant="caption" tone="muted">
                          {`${percent(share)}${price > 0 ? ' · ' : ''}`}
                        </Text>
                        {price > 0 && (
                          <CurrencyAmount
                            price={price}
                            amtZec={t.amount}
                            privacy={privacy}
                            style={{
                              fontSize: textVariants.caption.fontSize,
                              fontWeight: '400',
                              color: SOFT_INK,
                            }}
                          />
                        )}
                      </View>
                    </View>
                    {canAdd && (
                      <Pressable
                        kind="icon"
                        testID={`insight.row.${s.g}.add`}
                        accessibilityRole="button"
                        accessibilityLabel={
                          translate('insight.add-contact') as string
                        }
                        onPress={() => launchAddTagModal(group.address)}
                        hitSlop={slopFor(36)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: radiusPill,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <UserPlusIcon
                          size={iconSizeMd}
                          color={colors.fgAccent}
                        />
                      </Pressable>
                    )}
                  </View>
                  {on && (
                    <Text
                      testID={`insight.row.${s.g}.detail`}
                      variant="caption"
                      tone="muted"
                      onPress={onAmount}
                      style={{ marginTop: space8, marginLeft: 48 }}
                    >
                      {`${sendsText(t.sends)} · ${info.currencyName} ${zecText(t.amount)} · ${formatInteger(t.bytes)} ${translate('insight.bytes') as string}`}
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
