/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { space20, useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import BoldText from '@ui/primitives/BoldText';
import RegText from '@ui/primitives/RegText';
import Button from '@ui/primitives/Button';
import { ChevronLeft, ChevronRight } from '@ui/primitives/Icons/Chevron';

/** The side margin of the cards, which the Done button lines up with. */
export const CARD_SIDE = space20;

const FAST_MS = 150;

type RadioProps = { selected: boolean };

const Radio: React.FC<RadioProps> = ({ selected }) => {
  const { colors } = useTheme();
  const dot = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    dot.value = withTiming(selected ? 1 : 0, {
      duration: 200,
      easing: selected ? ease.spring : ease.standard,
    });
  }, [selected, dot]);
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dot.value }],
  }));
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? colors.fgAccent : colors.borderMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: colors.fgAccent,
          },
          dotStyle,
        ]}
      />
    </View>
  );
};

type LatencyProps = {
  // undefined while unknown, null when the server did not answer.
  ms: number | null | undefined;
  notResponding: string;
};

export const Latency: React.FC<LatencyProps> = ({ ms, notResponding }) => {
  const { colors } = useTheme();
  if (ms === undefined) {
    return null;
  }
  const bad = ms === null;
  /** Not responding is a state, not an error: another server can be picked. */
  const dot = bad
    ? colors.fgWarning
    : ms < FAST_MS
      ? colors.fgAccent
      : colors.fgMuted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }}
      />
      <RegText
        style={{
          fontSize: 12,
          color: bad ? colors.fgWarning : colors.fgMuted,
        }}
      >
        {bad ? notResponding : `${ms} ms`}
      </RegText>
    </View>
  );
};

type ServerRowProps = {
  title: string;
  sub?: string;
  selected: boolean;
  disabled?: boolean;
  first?: boolean;
  chevron?: boolean;
  right?: React.ReactNode;
  // Changes to shake the row once, for a pick that cannot be honoured.
  shake?: number;
  onPress: () => void;
  testID: string;
};

const ServerRow: React.FC<ServerRowProps> = ({
  title,
  sub,
  selected,
  disabled = false,
  first = false,
  chevron = false,
  right,
  shake = 0,
  onPress,
  testID,
}) => {
  const { colors } = useTheme();
  const x = useSharedValue(0);
  useEffect(() => {
    if (shake === 0) {
      return;
    }
    const step = { duration: 60, easing: ease.standard };
    x.value = withSequence(
      withTiming(-5, step),
      withTiming(5, step),
      withTiming(-3, step),
      withTiming(0, step),
    );
  }, [shake, x]);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <Animated.View style={shakeStyle}>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled }}
        style={({ pressed }) => ({
          minHeight: 55,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 13,
          paddingVertical: 10,
          paddingLeft: 14.5,
          paddingRight: 16,
          borderTopWidth: first ? 0 : 1,
          borderTopColor: colors.borderSubtle,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Radio selected={selected} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <RegText
            numberOfLines={1}
            style={{ fontSize: 15, lineHeight: 19, fontWeight: '600' }}
          >
            {title}
          </RegText>
          {!!sub && (
            <RegText
              style={{ fontSize: 12, lineHeight: 16, color: colors.fgMuted }}
            >
              {sub}
            </RegText>
          )}
        </View>
        {right}
        {chevron && <ChevronRight size={16} color={colors.fgMuted} />}
      </Pressable>
    </Animated.View>
  );
};

export const RowCard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: CARD_SIDE,
        borderRadius: 14,
        backgroundColor: colors.bgSurface,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
};

const TITLE_TOP = 2;
const TITLE_H = 44;
const BELOW_TITLE = 10;

/** Where a server screen is shown: alone, or under the app's shared header. */
export type Placement = 'screen' | 'belowHeader';

/**
 * How far to raise a server screen's content. The prototype's fractions of
 * the screen height leave room for the top bar; under the shared header that
 * room is already taken, so the first block moves up to sit under the title.
 */
export const liftFor = (
  placement: Placement,
  firstTop: number,
  height: number,
): number =>
  placement === 'belowHeader'
    ? Math.max(0, firstTop * height - (TITLE_TOP + TITLE_H + BELOW_TITLE))
    : 0;

export const useLift = (placement: Placement, firstTop: number) => {
  const [height, setHeight] = useState(0);
  const lift = liftFor(placement, firstTop, height);
  return {
    lift,
    onLayout: (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height),
  };
};

export const ScreenHeader: React.FC<{
  title: string;
  onBack: () => void;
  disabled: boolean;
  testID: string;
}> = ({ title, onBack, disabled, testID }) => {
  const { colors } = useTheme();
  return (
    <>
      <Pressable
        testID={testID}
        onPress={onBack}
        disabled={disabled}
        hitSlop={14}
        accessibilityRole="button"
        style={({ pressed }) => ({
          position: 'absolute',
          left: 17,
          top: TITLE_TOP,
          width: TITLE_H,
          height: TITLE_H,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
          backgroundColor: pressed ? colors.bgSurface : 'transparent',
        })}
      >
        <ChevronLeft size={20} color={colors.fgAccent} />
      </Pressable>
      <BoldText
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          top: 14,
          fontSize: 16,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        {title}
      </BoldText>
    </>
  );
};

export const DoneButton: React.FC<{
  title: string;
  onPress: () => void;
  disabled: boolean;
  testID: string;
}> = ({ title, onPress, disabled, testID }) => (
  <View
    style={{
      position: 'absolute',
      bottom: 44,
      left: CARD_SIDE,
      right: CARD_SIDE,
    }}
  >
    <Button
      testID={testID}
      variant="primary"
      title={title}
      onPress={onPress}
      disabled={disabled}
    />
  </View>
);

export default ServerRow;
