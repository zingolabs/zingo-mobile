/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Text as SvgText } from 'react-native-svg';

import { ease } from '@app/theme/motion';
import {
  Group,
  Insight,
  metricOf,
  Metric,
  niceTop,
} from '@screens/Insight/insightModel';
import { themeTokens } from '@app/theme';

const H = 168;
const TOP = 18;
const BOTTOM = 22;
const GROW_MS = 560;
const GROW_STAGGER = 22;
const GROW_WINDOW = 400;
const SEAM = themeTokens.bgSurface;
const GRID = themeTokens.borderSubtle;
const TICK_INK = themeTokens.fgMuted;
const AXIS_INK = themeTokens.fgMuted;
const TIP_BG = themeTokens.bgCanvas;
const TIP_LINE = themeTokens.bottomSheetBorder;
const TIP_HEAD = themeTokens.fgDefault;
const TIP_INK = themeTokens.fgDefault;
const TIP_RULE = themeTokens.borderSubtle;

type Segment = { color: string; height: number };

type BarProps = {
  left: number;
  width: number;
  segments: Segment[];
  index: number;
  grow: number;
};

// One week's stack, growing up from the baseline after the bars before it.
const Bar: React.FunctionComponent<BarProps> = ({
  left,
  width,
  segments,
  index,
  grow,
}) => {
  const stagger = useRef(index * GROW_STAGGER);
  stagger.current = index * GROW_STAGGER;
  const scale = useSharedValue(0);
  useEffect(() => {
    if (Date.now() - grow > GROW_WINDOW) {
      scale.value = 1;
      return;
    }
    scale.value = 0;
    scale.value = withDelay(
      stagger.current,
      withTiming(1, {
        duration: GROW_MS,
        easing: ease.emphasized,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [grow, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));
  const radius = Math.min(width / 2, 6);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left,
          bottom: BOTTOM,
          width,
          transformOrigin: 'bottom',
        },
        style,
      ]}
    >
      {segments.map((s, k) => (
        <View
          key={k}
          style={{
            height: Math.max(1, s.height),
            backgroundColor: s.color,
            borderTopWidth: k === 0 ? 0 : 0.8,
            borderTopColor: SEAM,
            borderTopLeftRadius: k === 0 ? radius : 0,
            borderTopRightRadius: k === 0 ? radius : 0,
          }}
        />
      ))}
    </Animated.View>
  );
};

type ActivityChartProps = {
  insight: Insight;
  metric: Metric;
  from: number;
  to: number;
  /** When the bars last started growing; bars mounted later appear grown. */
  grow: number;
  week: number;
  onWeek: (week: number) => void;
  name: (group: Group) => string;
  dayLabel: (w: number) => string;
  rangeLabel: (w: number) => string;
  value: (v: number) => string;
  totalLabel: string;
  noneLabel: string;
};

// Stacked weekly bars, one color per recipient, with a card for the tapped week.
const ActivityChart: React.FunctionComponent<ActivityChartProps> = ({
  insight,
  metric,
  from,
  to,
  grow,
  week,
  onWeek,
  name,
  dayLabel,
  rangeLabel,
  value,
  totalLabel,
  noneLabel,
}) => {
  const [width, setWidth] = useState(0);
  const [tipW, setTipW] = useState(160);
  const n = to - from + 1;
  const plotH = H - TOP - BOTTOM;
  const slot = width / Math.max(1, n);
  const barW = Math.max(3, Math.min(28, slot * 0.64));
  const columns = Array.from({ length: n }, (_, i) =>
    insight.groups.map((_g, g) => metricOf(insight.cells[g][from + i], metric)),
  );
  const top = niceTop(
    Math.max(0, ...columns.map(c => c.reduce((s, v) => s + v, 0))),
    metric,
  );
  const tickText = (v: number) => String(+v.toFixed(2));
  const labels = Math.min(4, n);
  const labelAt = Array.from({ length: labels }, (_, k) =>
    labels > 1 ? Math.round((k * (n - 1)) / (labels - 1)) : 0,
  );

  const rows = week >= from && week <= to ? columns[week - from] : [];
  const tipRows = rows.map((v, g) => ({ v, g })).filter(r => r.v > 0);
  const tipTotal = tipRows.reduce((s, r) => s + r.v, 0);
  const tipCenter = (week - from + 0.5) * slot;
  const tipLeft = Math.max(0, Math.min(width - tipW, tipCenter - tipW / 2));

  return (
    <View
      testID="insight.chart"
      style={{ height: H, marginHorizontal: -2 }}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Svg width={width} height={H} style={{ position: 'absolute' }}>
          {[0, 0.5, 1].map(f => {
            const y = TOP + plotH * (1 - f);
            return (
              <React.Fragment key={f}>
                <Line
                  x1={0}
                  x2={width}
                  y1={y}
                  y2={y}
                  stroke={GRID}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
                {f > 0 && (
                  <SvgText x={0} y={y - 5} fontSize={10} fill={TICK_INK}>
                    {tickText(top * f)}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
          {labelAt.map(i => (
            <SvgText
              key={i}
              x={Math.max(18, Math.min(width - 18, i * slot + slot / 2))}
              y={H - 4}
              fontSize={10}
              fill={AXIS_INK}
              textAnchor="middle"
            >
              {dayLabel(from + i)}
            </SvgText>
          ))}
        </Svg>
      )}
      {week >= from && week <= to && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: (week - from) * slot,
            top: TOP - 4,
            width: slot,
            height: plotH + 4,
            borderRadius: 6,
            backgroundColor: themeTokens.bgMutedSubtle,
          }}
        />
      )}
      {width > 0 &&
        columns.map((column, i) => {
          const segments = column
            .map((v, g) => ({
              color: insight.groups[g].color,
              height: (v / top) * plotH,
              g,
            }))
            .filter(s => s.height > 0)
            .reverse();
          return segments.length === 0 ? null : (
            <Bar
              key={from + i}
              left={i * slot + (slot - barW) / 2}
              width={barW}
              segments={segments}
              index={i}
              grow={grow}
            />
          );
        })}
      <Pressable
        testID="insight.chart.hit"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: BOTTOM,
        }}
        onPress={e => {
          const w = from + Math.floor(e.nativeEvent.locationX / slot);
          onWeek(w === week || w < from || w > to ? -1 : w);
        }}
      />
      {week >= from && week <= to && (
        <View
          testID="insight.chart.tip"
          pointerEvents="none"
          onLayout={e => setTipW(e.nativeEvent.layout.width)}
          style={{
            position: 'absolute',
            top: -6,
            left: tipLeft,
            minWidth: 150,
            maxWidth: 210,
            paddingHorizontal: 11,
            paddingTop: 9,
            paddingBottom: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: TIP_LINE,
            backgroundColor: TIP_BG,
          }}
        >
          <Text
            style={{
              marginBottom: 5,
              color: TIP_HEAD,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            {rangeLabel(week)}
          </Text>
          {tipRows.length === 0 && (
            <Text style={{ color: TIP_INK, fontSize: 12, lineHeight: 18 }}>
              {noneLabel}
            </Text>
          )}
          {tipRows.map(r => (
            <View
              key={r.g}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2.5,
                  backgroundColor: insight.groups[r.g].color,
                }}
              />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: TIP_INK,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {name(insight.groups[r.g])}
              </Text>
              <Text style={{ color: TIP_INK, fontSize: 12, fontWeight: '600' }}>
                {value(r.v)}
              </Text>
            </View>
          ))}
          {tipRows.length > 1 && (
            <View
              style={{
                flexDirection: 'row',
                marginTop: 4,
                paddingTop: 4,
                borderTopWidth: 1,
                borderTopColor: TIP_RULE,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: themeTokens.fgDefault,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {totalLabel}
              </Text>
              <Text
                style={{
                  color: themeTokens.fgDefault,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {value(tipTotal)}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default ActivityChart;
