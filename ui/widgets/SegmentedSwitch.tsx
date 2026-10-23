/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  AnimatedStyle,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import RegText from '@ui/primitives/RegText';

const THUMB_MS = 260;
const HEIGHT = 37;
/** The thumb sits inside the container's 1 pt border on each side. */
const INSET = 2;

export type SegmentedOption<K extends string> = {
  key: K;
  label: string;
  testID: string;
};

type SegmentedSwitchProps<K extends string> = {
  testID: string;
  options: SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
  disabled?: boolean;
  style?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
};

/** A pill of options with a thumb that slides to the chosen one. */
function SegmentedSwitch<K extends string>({
  testID,
  options,
  value,
  onChange,
  disabled,
  style,
}: SegmentedSwitchProps<K>) {
  const { colors } = useTheme();
  const index = Math.max(
    0,
    options.findIndex(option => option.key === value),
  );
  const [width, setWidth] = useState(0);
  const thumb = useSharedValue(index);

  useEffect(() => {
    thumb.value = withTiming(index, {
      duration: THUMB_MS,
      easing: ease.emphasized,
    });
  }, [index, thumb]);

  const segment = (width - INSET * 2) / options.length;
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumb.value * segment }],
  }));

  return (
    <Animated.View
      testID={testID}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      style={[
        {
          height: HEIGHT,
          borderRadius: 999,
          backgroundColor: colors.bgSurface,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          flexDirection: 'row',
        },
        style,
      ]}
    >
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 1,
              bottom: 1,
              left: 1,
              width: segment,
              borderRadius: 999,
              backgroundColor: colors.bgAccentSubtle,
              borderWidth: 1,
              borderColor: colors.borderAccent,
            },
            thumbStyle,
          ]}
        />
      )}
      {options.map(option => (
        <Pressable
          key={option.key}
          testID={option.testID}
          onPress={() => onChange(option.key)}
          disabled={disabled}
          accessibilityRole="tab"
          accessibilityState={{ selected: option.key === value }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <RegText
            style={{
              fontSize: 12.5,
              fontWeight: '600',
              color: option.key === value ? colors.fgDefault : colors.fgMuted,
            }}
          >
            {option.label}
          </RegText>
        </Pressable>
      ))}
    </Animated.View>
  );
}

export default SegmentedSwitch;
