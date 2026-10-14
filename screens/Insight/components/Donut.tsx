/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { ease } from '@app/theme/motion';

const SIZE = 232;
const C = SIZE / 2;
const R = 86;
const SW = 28;
const MIN_SHARE = 0.11;
const POP = 8;
const POP_MS = 260;
const DIM_MS = 200;
const DIM = 0.3;
const HIT = SW / 2 + 6;
const IN_MS = 720;
const IN_AT = 260;
const TRACK = '#0A1F3D';
const DARK_INK = '#07121F';
const SOFT_INK = '#8DA0B8';
const CODE_INK = '#B9C6D6';

export type Slice = { g: number; value: number; color: string };

type Arc = Slice & { a0: number; a1: number; share: number };

/** Whether a color is light enough to need dark text on it. */
const light = (color: string): boolean => {
  const hex = color.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.72;
};

const arcs = (slices: Slice[]): Arc[] => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const widths = slices.map(s => Math.max(s.value / total, MIN_SHARE));
  const sum = widths.reduce((s, w) => s + w, 0);
  let at = -Math.PI / 2;
  return slices.map((s, i) => {
    const a0 = at;
    at += (widths[i] / sum) * Math.PI * 2;
    return { ...s, a0, a1: at, share: s.value / total };
  });
};

const point = (angle: number, radius = R) =>
  `${C + Math.cos(angle) * radius} ${C + Math.sin(angle) * radius}`;

type SliceLayerProps = { arc: Arc; alone: boolean; selected: number };

// One slice on its own layer, so it can push out and dim on its own.
const SliceLayer: React.FunctionComponent<SliceLayerProps> = ({
  arc,
  alone,
  selected,
}) => {
  const mid = (arc.a0 + arc.a1) / 2;
  const pop = useSharedValue(0);
  const fade = useSharedValue(1);
  useEffect(() => {
    pop.value = withTiming(selected === arc.g ? 1 : 0, {
      duration: POP_MS,
      easing: ease.emphasized,
      reduceMotion: ReduceMotion.System,
    });
    fade.value = withTiming(selected >= 0 && selected !== arc.g ? DIM : 1, {
      duration: DIM_MS,
    });
  }, [selected, arc.g, pop, fade]);
  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateX: Math.cos(mid) * POP * pop.value },
      { translateY: Math.sin(mid) * POP * pop.value },
    ],
  }));
  const cap = (SW / 2 + 3) / R;
  const s0 = arc.a0 + cap;
  const s1 = arc.a1 - cap;
  const label = arc.share < 0.01 ? '<1%' : `${Math.round(arc.share * 100)}%`;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, top: 0 }, style]}
    >
      <Svg width={SIZE} height={SIZE}>
        {alone ? (
          <Circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth={SW}
          />
        ) : s1 <= s0 ? (
          <Circle
            cx={C + Math.cos(mid) * R}
            cy={C + Math.sin(mid) * R}
            r={SW / 2}
            fill={arc.color}
          />
        ) : (
          <Path
            d={`M${point(s0)}A${R} ${R} 0 ${s1 - s0 > Math.PI ? 1 : 0} 1 ${point(s1)}`}
            fill="none"
            stroke={arc.color}
            strokeWidth={SW}
            strokeLinecap="round"
          />
        )}
        <SvgText
          x={C + Math.cos(mid) * R}
          y={C + Math.sin(mid) * R + 4}
          fontSize={10}
          fontWeight="700"
          fill={light(arc.color) ? DARK_INK : '#fff'}
          textAnchor="middle"
        >
          {label}
        </SvgText>
      </Svg>
    </Animated.View>
  );
};

type DonutProps = {
  slices: Slice[];
  selected: number;
  onSelect: (g: number) => void;
  value: string;
  usd: string;
  caption: string;
};

// Where the sends went: a ring of rounded slices with the total, or the
// selected slice's value, in the middle.
const Donut: React.FunctionComponent<DonutProps> = ({
  slices,
  selected,
  onSelect,
  value,
  usd,
  caption,
}) => {
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withDelay(
      IN_AT,
      withTiming(1, {
        duration: IN_MS,
        easing: ease.out,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [shown]);
  const inStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [
      { rotate: `${-35 * (1 - shown.value)}deg` },
      { scale: 0.88 + 0.12 * shown.value },
    ],
  }));
  const all = arcs(slices);

  const tap = (x: number, y: number) => {
    const dx = x - C;
    const dy = y - C;
    if (Math.abs(Math.hypot(dx, dy) - R) > HIT) {
      onSelect(-1);
      return;
    }
    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) {
      angle += Math.PI * 2;
    }
    const hit = all.find(a => angle >= a.a0 && angle < a.a1);
    onSelect(!hit || hit.g === selected ? -1 : hit.g);
  };

  return (
    <View
      testID="insight.donut"
      style={{
        width: SIZE,
        height: SIZE,
        alignSelf: 'center',
        marginTop: 6,
        marginBottom: 4,
      }}
    >
      <Animated.View style={[{ width: SIZE, height: SIZE }, inStyle]}>
        {all.length === 0 && (
          <Svg width={SIZE} height={SIZE}>
            <Circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={TRACK}
              strokeWidth={SW}
            />
          </Svg>
        )}
        {all.map(a => (
          <SliceLayer
            key={a.g}
            arc={a}
            alone={all.length === 1}
            selected={selected}
          />
        ))}
      </Animated.View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: C - 59,
          top: 0,
          bottom: 0,
          width: 118,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          testID="insight.donut.value"
          style={{
            color: '#D3E2F8',
            fontSize: 22,
            lineHeight: 26,
            fontWeight: '700',
          }}
        >
          {value}
        </Text>
        {!!usd && (
          <Text
            style={{
              marginTop: 1,
              color: CODE_INK,
              fontSize: 12.5,
              lineHeight: 16,
              fontWeight: '600',
            }}
          >
            {usd}
          </Text>
        )}
        <Text
          style={{
            marginTop: 2,
            color: SOFT_INK,
            fontSize: 11.5,
            lineHeight: 15,
            textAlign: 'center',
          }}
        >
          {caption}
        </Text>
      </View>
      <Pressable
        testID="insight.donut.hit"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: SIZE,
          height: SIZE,
        }}
        onPress={e => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
      />
    </View>
  );
};

export default Donut;
