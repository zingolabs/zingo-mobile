/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
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
import { themeTokens } from '@app/theme';

const BASE_R = 86;
const SW = 28;
// Room around the ring for a slice pushed out, and between the ring's inner
// edge and the figure in the middle.
const EDGE = 16;
const PAD = 14;
const MIN_SHARE = 0.11;
const POP = 8;
const POP_MS = 260;
const DIM_MS = 200;
const DIM = 0.3;
const HIT = SW / 2 + 6;
const IN_MS = 720;
const IN_AT = 260;
const TRACK = themeTokens.bgMutedSubtle;
const DARK_INK = themeTokens.fgOnAccent;
const SOFT_INK = themeTokens.fgMuted;

export type Slice = { g: number; value: number; color: string };

type Arc = Slice & { a0: number; a1: number; share: number };

/** The ring's box, centre and radius. */
type Geometry = { size: number; c: number; r: number };

const ringOf = (r: number): Geometry => {
  const size = 2 * (r + SW / 2 + EDGE);
  return { size, c: size / 2, r };
};

/** A ring wide enough for the middle content, capped at the room there is, and the scale the content then needs. */
export const fitRing = (
  content: { width: number; height: number },
  room: number,
): { geometry: Geometry; scale: number } => {
  const half = Math.hypot(content.width / 2, content.height / 2);
  const wanted = ringOf(Math.max(BASE_R, half + PAD + SW / 2));
  if (room <= 0 || wanted.size <= room) {
    return { geometry: wanted, scale: 1 };
  }
  const r = Math.max(BASE_R, room / 2 - SW / 2 - EDGE);
  const inner = r - SW / 2 - PAD;
  return {
    geometry: ringOf(r),
    scale: half > 0 ? Math.min(1, inner / half) : 1,
  };
};

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

const point = ({ c, r }: Geometry, angle: number) =>
  `${c + Math.cos(angle) * r} ${c + Math.sin(angle) * r}`;

type SliceLayerProps = {
  arc: Arc;
  alone: boolean;
  selected: number;
  geometry: Geometry;
};

// One slice on its own layer, so it can push out and dim on its own.
const SliceLayer: React.FunctionComponent<SliceLayerProps> = ({
  arc,
  alone,
  selected,
  geometry,
}) => {
  const { size: SIZE, c: C, r: R } = geometry;
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
            d={`M${point(geometry, s0)}A${R} ${R} 0 ${s1 - s0 > Math.PI ? 1 : 0} 1 ${point(geometry, s1)}`}
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
          fill={light(arc.color) ? DARK_INK : themeTokens.fgDefault}
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
  /** The total, or the selected slice's value, drawn by the caller. */
  center: React.ReactNode;
  caption: string;
};

// Where the sends went: a ring of rounded slices with the total, or the
// selected slice's value, in the middle.
const Donut: React.FunctionComponent<DonutProps> = ({
  slices,
  selected,
  onSelect,
  center,
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
  const [room, setRoom] = useState(0);
  const [content, setContent] = useState({ width: 0, height: 0 });
  const { geometry, scale } = fitRing(content, room);
  const { size: SIZE, c: C, r: R } = geometry;

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
      onLayout={e => setRoom(e.nativeEvent.layout.width)}
      style={{ alignItems: 'center', marginTop: 6, marginBottom: 4 }}
    >
      <View testID="insight.donut" style={{ width: SIZE, height: SIZE }}>
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
              geometry={geometry}
            />
          ))}
        </Animated.View>
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
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          testID="insight.donut.center"
          onLayout={e =>
            setContent({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
          style={{ alignItems: 'center', transform: [{ scale }] }}
        >
          {center}
          <Text
            style={{
              marginTop: 2,
              color: SOFT_INK,
              fontSize: 12,
              lineHeight: 15,
              textAlign: 'center',
            }}
          >
            {caption}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default Donut;
