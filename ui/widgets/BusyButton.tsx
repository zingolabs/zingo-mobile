/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';

type BusyButtonProps = {
  title: string;
  enabled: boolean;
  busy: boolean;
  onPress: () => void;
  onDisabledPress: () => void;
  testID?: string;
  labelSize?: number;
};

const HEIGHT = 42;
const BUSY_SIZE = 42;
const NUDGE_PX = 4;

const BusyButton: React.FunctionComponent<BusyButtonProps> = ({
  title,
  enabled,
  busy,
  onPress,
  onDisabledPress,
  testID,
  labelSize = 14.5,
}) => {
  const { colors } = useTheme();
  const naturalWidth = useSharedValue(0);
  const on = useSharedValue(enabled ? 1 : 0);
  const collapse = useSharedValue(busy ? 1 : 0);
  const nudge = useSharedValue(0);

  useEffect(() => {
    on.value = withTiming(enabled ? 1 : 0, {
      duration: duration.base,
      easing: ease.standard,
    });
  }, [enabled, on]);

  useEffect(() => {
    collapse.value = withTiming(busy ? 1 : 0, {
      duration: duration.emphasized,
      easing: ease.emphasized,
    });
  }, [busy, collapse]);

  const frame = useAnimatedStyle(() => {
    const bg = interpolateColor(
      on.value,
      [0, 1],
      [colors.bgSecondaryDisabled, colors.bgAccent],
    );
    const width =
      naturalWidth.value > 0
        ? naturalWidth.value + (BUSY_SIZE - naturalWidth.value) * collapse.value
        : undefined;
    return {
      backgroundColor: bg,
      borderColor: bg,
      width,
      height: HEIGHT + (BUSY_SIZE - HEIGHT) * collapse.value,
      borderRadius: HEIGHT / 2,
      transform: [{ translateX: nudge.value }],
    };
  });
  const label = useAnimatedStyle(() => ({ opacity: 1 - collapse.value }));
  const spinner = useAnimatedStyle(() => ({ opacity: collapse.value }));

  const press = () => {
    if (busy) {
      return;
    }
    if (enabled) {
      onPress();
      return;
    }
    const step = 60;
    nudge.value = withSequence(
      withTiming(-NUDGE_PX, { duration: step }),
      withTiming(NUDGE_PX, { duration: step }),
      withTiming(-NUDGE_PX, { duration: step }),
      withTiming(0, { duration: step }),
    );
    onDisabledPress();
  };

  return (
    <Animated.View
      onLayout={e => {
        if (!busy && naturalWidth.value === 0) {
          naturalWidth.value = e.nativeEvent.layout.width;
        }
      }}
      style={[
        {
          borderWidth: 2,
          minWidth: BUSY_SIZE,
          paddingHorizontal: busy ? 0 : 24,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        frame,
      ]}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: !enabled || busy }}
        onPress={press}
        style={{
          alignSelf: 'stretch',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.Text
          numberOfLines={1}
          style={[
            {
              color: colors.bgCanvas,
              fontWeight: '600',
              fontSize: labelSize,
              textAlign: 'center',
            },
            label,
          ]}
        >
          {title}
        </Animated.Text>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              alignItems: 'center',
              justifyContent: 'center',
            },
            spinner,
          ]}
        >
          {busy && (
            <ActivityIndicator
              testID={testID ? `${testID}.spinner` : undefined}
              size="small"
              color={colors.bgCanvas}
            />
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

export default BusyButton;
