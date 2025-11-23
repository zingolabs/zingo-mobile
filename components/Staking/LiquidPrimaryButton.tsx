// TODO: Move somewhere else

import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ColorValue,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';
import { ThemeType } from '../../app/types';

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
  const { colors } = useTheme() as ThemeType;
  const [, setPressed] = useState(false);

  const primary = tintColor ?? colors.zingo ?? colors.primary ?? '#4f8cff';

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
        style={[
          styles.glass,
          style,
          !isLiquidGlassSupported && styles.fallback,
          disabled && styles.disabled,
        ]}
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
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
});

export default LiquidPrimaryButton;
