/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Keyframe,
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

const rise = (delay: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 8 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: ease.out },
  })
    .duration(300)
    .delay(delay)
    .reduceMotion(ReduceMotion.System);
const tilePop = () =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.6 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: ease.spring },
  })
    .duration(360)
    .delay(200)
    .reduceMotion(ReduceMotion.System);

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
    wiggle.value = withDelay(
      480,
      withSequence(turn(-10), turn(9), turn(-6), turn(3), turn(0)),
    );
  }, [leaving, dim, drop, wiggle, onGone]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }],
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
          entering={tilePop()}
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: TILE_BG,
            borderWidth: 1,
            borderColor: TILE_BORDER,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          <Animated.View style={wiggleStyle}>
            <TriangleAlert size={24} color={ALERT_INK} />
          </Animated.View>
        </Animated.View>
        <Animated.Text
          entering={rise(260)}
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
        </Animated.Text>
        <Animated.Text
          entering={rise(300)}
          style={{
            color: BODY_INK,
            fontSize: 14,
            lineHeight: 20,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          {translate('seedbackup.shot-body') as string}
        </Animated.Text>
        <Animated.View entering={rise(340)} style={{ alignSelf: 'stretch' }}>
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
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default ScreenshotSheet;
