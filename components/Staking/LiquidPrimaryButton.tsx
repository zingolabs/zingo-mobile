// TODO: Move somewhere else

import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ColorValue,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';
import { ThemeType } from '../../app/types/ThemeType';
import NativePrimaryFallback from './NativePrimaryFallback';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  tintColor?: ColorValue; // optional override
};

const LiquidPrimaryButton: React.FC<Props> = ({
  title,
  onPress,
  disabled,
  style,
  textStyle,
  tintColor,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;
  const [, setPressed] = useState(false);

  const primary =
    (tintColor as string | undefined) ??
    colors.zingo ??
    colors.primary ??
    '#4f8cff';

  if (!isLiquidGlassSupported) {
    return (
      <View style={style}>
        <NativePrimaryFallback
          title={title}
          onPress={onPress}
          disabled={disabled}
        />
      </View>
    );
  }

  // Liquid glass
  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      <LiquidGlassView
        interactive
        effect="clear"
        colorScheme="system"
        tintColor={primary}
        style={[styles.glass, style, disabled && styles.disabled]}
      >
        <Text style={[styles.text, textStyle]}>{title}</Text>
      </LiquidGlassView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  glass: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  fallback: {
    backgroundColor: '#4f8cff',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  iosButtonContainer: {
    minWidth: 160,
    alignSelf: 'center',
  },
});

export default LiquidPrimaryButton;
