/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  iconSizeSm,
  radiusMd,
  radiusPill,
  rowMinHeight,
  space12,
  space16,
  useTheme,
} from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import Pressable from '@ui/primitives/Pressable';
import Text from '@ui/primitives/Text';
import { ChevronRight } from '@ui/primitives/Icons/Chevron';
import { Icon } from '@ui/primitives/Icons/Icon';

const ICON_DISC = 40;
// On touch the card shrinks a little and its border brightens.
const PRESS_MS = duration.fast;
const PRESS_SCALE = 0.985;

type OptionCardProps = {
  icon: React.ComponentType<React.ComponentProps<typeof Icon>>;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  subColor: string;
  disabled: boolean;
  onPress: () => void;
  testID: string;
};

/** A choice that leads on: the icon in its disc, a title, a line under it and a chevron. */
const OptionCard: React.FC<OptionCardProps> = ({
  icon: OptionIcon,
  iconBg,
  iconColor,
  title,
  sub,
  subColor,
  disabled,
  onPress,
  testID,
}) => {
  const { colors } = useTheme();
  const press = useSharedValue(0);
  const to = (v: number) => {
    press.value = withTiming(v, { duration: PRESS_MS, easing: ease.out });
  };
  const pressStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      press.value,
      [0, 1],
      [colors.bottomSheetBorder, colors.borderFocus],
    ),
    transform: [{ scale: 1 - (1 - PRESS_SCALE) * press.value }],
  }));
  return (
    <Pressable
      kind="row"
      testID={testID}
      onPress={onPress}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          {
            minHeight: rowMinHeight,
            borderRadius: radiusMd,
            borderWidth: 1,
            backgroundColor: colors.bgSurface,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: space16,
            paddingVertical: space12,
            gap: space12,
          },
          pressStyle,
        ]}
      >
        <View
          style={{
            width: ICON_DISC,
            height: ICON_DISC,
            borderRadius: radiusPill,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <OptionIcon size={iconSizeSm} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{title}</Text>
          <Text variant="caption" color={subColor}>
            {sub}
          </Text>
        </View>
        <ChevronRight size={iconSizeSm} color={colors.fgMuted} />
      </Animated.View>
    </Pressable>
  );
};

export default OptionCard;
