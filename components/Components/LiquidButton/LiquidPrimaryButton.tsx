import React from 'react';
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
import { ThemeType } from '../../../app/types';
import NativePrimaryFallback from './NativePrimaryFallback';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  tintColor?: ColorValue;
  testID?: string;
};

const LiquidPrimaryButton: React.FC<Props> = ({
  title,
  onPress,
  disabled,
  style,
  textStyle,
  tintColor,
  testID,
}) => {
  const { colors } = useTheme() as ThemeType;

  const primary = disabled ? colors.secondary : (tintColor ?? colors.primary);

  if (!isLiquidGlassSupported) {
    return (
      <View style={style}>
        <NativePrimaryFallback
          title={title}
          onPress={onPress}
          disabled={disabled}
          style={style}
          textStyle={textStyle}
          tintColor={tintColor}
          testID={testID}
        />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback
      testID={testID}
      style={[styles.container, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <LiquidGlassView
        key={disabled ? 'glass-disabled' : 'glass-enabled'}
        interactive={!disabled}
        effect="clear"
        colorScheme="system"
        tintColor={primary}
        style={[styles.primary, disabled && styles.disabled]}
      >
        <Text style={[styles.text, textStyle]}>{title}</Text>
      </LiquidGlassView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {},
  primary: {
    flex: 1,
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
