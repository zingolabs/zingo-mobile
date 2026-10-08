/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
  WithTimingConfig,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { ChevronDown } from '@ui/primitives/Icons/Chevron';

export type Notice = {
  key: string;
  node: React.ReactNode;
};

type NoticeStackProps = {
  notices: Notice[];
  onHeight: (height: number) => void;
};

const PEEK = 12;
const GAP = 10;
const LABEL_H = 26;
const MARGIN_TOP = 10;
const MARGIN_BOTTOM = 12;
const SCALE_STEP = 0.06;
const OPACITY_STEP = 0.1;
const RADIUS = 14;

const move: WithTimingConfig = {
  duration: duration.sheet,
  easing: ease.out,
  reduceMotion: ReduceMotion.System,
};
const fade: WithTimingConfig = {
  duration: duration.axis,
  easing: ease.standard,
  reduceMotion: ReduceMotion.System,
};

const leave = () =>
  new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    100: {
      opacity: 0,
      transform: [{ translateY: -6 }, { scale: 0.96 }],
      easing: ease.standard,
    },
  })
    .duration(duration.axis)
    .reduceMotion(ReduceMotion.Never);

type Slot = {
  top: number;
  height: number;
  scale: number;
  opacity: number;
  deck: boolean;
};

const slots = (heights: number[], open: boolean): Slot[] => {
  const front = heights[0] ?? 0;
  let y = 0;
  return heights.map((h, i) => {
    if (open || i === 0) {
      const top = y;
      y += h + GAP;
      return { top, height: h, scale: 1, opacity: 1, deck: false };
    }
    const scale = 1 - SCALE_STEP * i;
    return {
      top: PEEK * i + (front * (1 - scale)) / 2,
      height: front,
      scale,
      opacity: 1 - OPACITY_STEP * i,
      deck: true,
    };
  });
};

const pileHeight = (heights: number[], open: boolean): number => {
  if (heights.length === 0) {
    return 0;
  }
  if (heights.length === 1) {
    return heights[0];
  }
  const cards = open
    ? heights.reduce((sum, h) => sum + h, 0) + GAP * (heights.length - 1)
    : heights[0] + PEEK * (heights.length - 1);
  return cards + LABEL_H;
};

const Card: React.FunctionComponent<{
  slot: Slot;
  depth: number;
  animate: boolean;
  onMeasure: (h: number) => void;
  children: React.ReactNode;
}> = ({ slot, depth, animate, onMeasure, children }) => {
  const { colors } = useTheme();
  const to = (v: number, cfg: WithTimingConfig) => {
    'worklet';
    return animate ? withTiming(v, cfg) : v;
  };
  const frame = useAnimatedStyle(() => ({
    top: to(slot.top, move),
    height: to(slot.height, move),
    opacity: to(slot.opacity, fade),
    transform: [{ scale: to(slot.scale, move) }],
  }));
  const deck = useAnimatedStyle(() => ({
    opacity: to(slot.deck ? 1 : 0, fade),
  }));
  const content = useAnimatedStyle(() => ({
    opacity: to(slot.deck ? 0 : 1, fade),
  }));
  return (
    <Animated.View
      exiting={leave()}
      pointerEvents={slot.deck ? 'none' : 'box-none'}
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          zIndex: 3 - depth,
          overflow: 'hidden',
          borderRadius: RADIUS,
        },
        frame,
      ]}
    >
      <Animated.View style={content}>
        <View onLayout={e => onMeasure(e.nativeEvent.layout.height)}>
          {children}
        </View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: RADIUS,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            backgroundColor: colors.bgSurface,
          },
          deck,
        ]}
      />
    </Animated.View>
  );
};

// Up to three notices piled like a deck under the balance, front first.
const NoticeStack: React.FunctionComponent<NoticeStackProps> = ({
  notices,
  onHeight,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const [animate, setAnimate] = useState(false);

  const shown = notices.slice(0, 3);
  const heights = shown.map(n => measured[n.key] ?? 0);
  const ready = shown.length > 0 && heights.every(h => h > 0);
  const expanded = open && shown.length > 1;
  const layout = slots(heights, expanded);
  const pile = pileHeight(heights, expanded);
  const height = shown.length > 0 ? pile + MARGIN_TOP + MARGIN_BOTTOM : 0;

  useEffect(() => {
    onHeight(ready || shown.length === 0 ? height : 0);
  }, [height, ready, shown.length, onHeight]);

  useEffect(() => {
    if (ready && !animate) {
      const id = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(id);
    }
  }, [ready, animate]);

  const box = useAnimatedStyle(() => ({
    height: animate ? withTiming(pile, move) : pile,
  }));
  const label = useAnimatedStyle(() => ({
    top: animate ? withTiming(pile - LABEL_H + 4, move) : pile - LABEL_H + 4,
  }));
  const chevron = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: withTiming(expanded ? '180deg' : '0deg', {
          duration: duration.axis,
          easing: ease.standard,
          reduceMotion: ReduceMotion.System,
        }),
      },
    ],
  }));

  if (shown.length === 0) {
    return null;
  }

  const more = shown.length - 1;

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: MARGIN_TOP,
        marginBottom: MARGIN_BOTTOM,
        opacity: ready ? 1 : 0,
      }}
    >
      <Animated.View style={box}>
        {shown.map((n, i) => (
          <Card
            key={n.key}
            slot={layout[i]}
            depth={i}
            animate={animate}
            onMeasure={h =>
              setMeasured(m => (m[n.key] === h ? m : { ...m, [n.key]: h }))
            }
          >
            {n.node}
          </Card>
        ))}
        {more > 0 && !expanded && (
          <Pressable
            testID="noticestack.peek"
            accessible={false}
            onPress={() => setOpen(true)}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: heights[0],
              height: PEEK * more,
              zIndex: 4,
            }}
          />
        )}
        {more > 0 && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                right: 0,
                alignItems: 'center',
                zIndex: 4,
              },
              label,
            ]}
          >
            <Pressable
              testID="noticestack.toggle"
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              hitSlop={8}
              onPress={() => setOpen(o => !o)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                height: LABEL_H - 4,
              }}
            >
              <Text
                style={{
                  color: colors.fgMuted,
                  fontSize: 11,
                  fontWeight: '700',
                }}
              >
                {expanded
                  ? (translate('notices.less') as string)
                  : (
                      translate(
                        more === 1 ? 'notices.more-one' : 'notices.more-other',
                      ) as string
                    ).replace('{n}', String(more))}
              </Text>
              <Animated.View style={chevron}>
                <ChevronDown size={12} color={colors.fgMuted} />
              </Animated.View>
            </Pressable>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
};

export default NoticeStack;
