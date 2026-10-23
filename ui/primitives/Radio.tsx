/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';

type RadioProps = { selected: boolean };

/** A radio mark: the ring turns green and the dot pops in when selected. */
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

export default Radio;
