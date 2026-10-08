/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radiusSheet, useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';

const DIM = 'rgba(0,5,12,0.93)';
const TILE_BG = '#242627';
const TILE_BORDER = '#76592F';
const ALERT_INK = '#F0A63C';
const BODY_INK = '#8DA0B8';
const OFFSCREEN = 600;

// Fades in and rises 8 pt once, delay ms after it mounts.
const Rise: React.FunctionComponent<{
  delay: number;
  children: React.ReactNode;
  stretch?: boolean;
}> = ({ delay, children, stretch }) => {
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withDelay(
      delay,
      withTiming(1, {
        duration: 300,
        easing: ease.out,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [delay, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: 8 * (1 - shown.value) }],
  }));
  return (
    <Animated.View style={[stretch ? { alignSelf: 'stretch' } : {}, style]}>
      {children}
    </Animated.View>
  );
};

type ScreenshotSheetProps = {
  leaving: boolean;
  onGone: () => void;
  onGotIt: () => void;
};

// Warns that a screenshot of the words was taken. Only "Got it" dismisses it.
const ScreenshotSheet: React.FunctionComponent<ScreenshotSheetProps> = ({
  leaving,
  onGone,
  onGotIt,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dim = useSharedValue(0);
  const drop = useSharedValue(OFFSCREEN);
  const wiggle = useSharedValue(0);
  const tile = useSharedValue(0);

  useEffect(() => {
    if (leaving) {
      drop.value = withTiming(OFFSCREEN, {
        duration: duration.sheetClose,
        easing: ease.in,
        reduceMotion: ReduceMotion.System,
      });
      dim.value = withDelay(
        40,
        withTiming(
          0,
          { duration: duration.sheetClose, easing: ease.standard },
          finished => {
            if (finished) {
              runOnJS(onGone)();
            }
          },
        ),
      );
      return;
    }
    dim.value = withTiming(1, { duration: 240, easing: ease.standard });
    drop.value = withDelay(
      60,
      withTiming(0, {
        duration: duration.sheet,
        easing: ease.emphasized,
        reduceMotion: ReduceMotion.System,
      }),
    );
    const turn = (deg: number) =>
      withTiming(deg, {
        duration: 100,
        easing: ease.standard,
        reduceMotion: ReduceMotion.System,
      });
    tile.value = withDelay(
      200,
      withTiming(1, {
        duration: 360,
        easing: ease.spring,
        reduceMotion: ReduceMotion.System,
      }),
    );
    wiggle.value = withDelay(
      480,
      withSequence(turn(-10), turn(9), turn(-6), turn(3), turn(0)),
    );
  }, [leaving, dim, drop, wiggle, tile, onGone]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }],
  }));
  const tileStyle = useAnimatedStyle(() => ({
    opacity: tile.value,
    transform: [{ scale: 0.6 + 0.4 * tile.value }],
  }));
  const wiggleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wiggle.value}deg` }],
  }));

  return (
    <View
      style={StyleSheet.absoluteFill}
      accessibilityViewIsModal
      testID="seedbackup.shot"
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: DIM }, dimStyle]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            paddingTop: 32,
            paddingHorizontal: 40,
            paddingBottom: insets.bottom + 28,
            backgroundColor: colors.bgSurface,
            borderTopWidth: 1,
            borderColor: colors.bottomSheetBorder,
            borderTopLeftRadius: radiusSheet,
            borderTopRightRadius: radiusSheet,
          },
          sheetStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: TILE_BG,
              borderWidth: 1,
              borderColor: TILE_BORDER,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            },
            tileStyle,
          ]}
        >
          <Animated.View style={wiggleStyle}>
            <TriangleAlert size={24} color={ALERT_INK} />
          </Animated.View>
        </Animated.View>
        <Rise delay={260}>
          <Text
            accessibilityRole="alert"
            style={{
              color: colors.fgDefault,
              fontSize: 16,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {translate('seedbackup.shot-title') as string}
          </Text>
        </Rise>
        <Rise delay={300}>
          <Text
            style={{
              color: BODY_INK,
              fontSize: 14,
              lineHeight: 20,
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            {translate('seedbackup.shot-body') as string}
          </Text>
        </Rise>
        <Rise delay={340} stretch>
          <Pressable
            testID="seedbackup.shot.ok"
            accessibilityRole="button"
            onPress={onGotIt}
            style={({ pressed }) => ({
              height: 44,
              marginHorizontal: 12,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bgAccent,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text
              style={{
                color: colors.bgCanvas,
                fontSize: 15,
                fontWeight: '700',
              }}
            >
              {translate('seedbackup.shot-ok') as string}
            </Text>
          </Pressable>
        </Rise>
      </Animated.View>
    </View>
  );
};

export default ScreenshotSheet;
