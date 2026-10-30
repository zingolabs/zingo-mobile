/* geometry-gap: DESIGN.md known gap */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  space20,
  useTheme,
  radiusMd,
  radiusPill,
  rowMinHeight,
  space8,
  space12,
  space16,
  iconSizeMd,
} from '@app/theme';
import { ease } from '@app/theme/motion';
import Pressable from '@ui/primitives/Pressable';
import BoldText from '@ui/primitives/BoldText';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import { ChevronLeft, ChevronRight } from '@ui/primitives/Icons/Chevron';
import Radio from '@ui/primitives/Radio';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';

/** The side margin of the cards, which the Done button lines up with. */
export const CARD_SIDE = space20;

const FAST_MS = 150;

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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space8 }}>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: radiusPill,
          backgroundColor: dot,
        }}
      />
      <Text variant="caption" tone={bad ? 'warning' : 'muted'}>
        {bad ? notResponding : `${ms} ms`}
      </Text>
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
        kind="row"
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled }}
        style={{
          minHeight: rowMinHeight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space12,
          paddingVertical: space8,
          paddingHorizontal: space16,
          borderTopWidth: first ? 0 : 1,
          borderTopColor: colors.borderSubtle,
        }}
      >
        <Radio selected={selected} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {title}
          </Text>
          {!!sub && (
            <Text variant="bodySmall" tone="muted">
              {sub}
            </Text>
          )}
        </View>
        {right}
        {chevron && <ChevronRight size={iconSizeMd} color={colors.fgMuted} />}
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
        borderRadius: radiusMd,
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
        kind="icon"
        testID={testID}
        onPress={onBack}
        disabled={disabled}
        hitSlop={14}
        accessibilityRole="button"
        style={{
          position: 'absolute',
          left: 17,
          top: TITLE_TOP,
          width: TITLE_H,
          height: TITLE_H,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
        }}
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
}> = ({ title, onPress, disabled, testID }) => {
  const bottomPad = useBottomActionPad();
  return (
    <View
      style={{
        position: 'absolute',
        bottom: bottomPad,
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
};

export default ServerRow;
