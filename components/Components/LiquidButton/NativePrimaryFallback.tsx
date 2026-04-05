import { useTheme } from '@react-navigation/native';
import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Platform,
  TextStyle,
  ColorValue,
} from 'react-native';
import { ThemeType } from '../../../app/types';

type NativePrimaryFallbackProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  textStyle?: TextStyle;
  tintColor?: ColorValue;
  testID?: string;
};

const NativePrimaryFallback: React.FC<NativePrimaryFallbackProps> = ({
  title,
  onPress,
  disabled,
  textStyle,
  tintColor,
  testID,
}) => {
  const { colors } = useTheme() as ThemeType;

  const primary = disabled ? colors.secondary : (tintColor ?? colors.primary);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: primary },
        pressed && !disabled && styles.primaryPressed,
        disabled && styles.primaryDisabled,
      ]}
    >
      <Text style={[styles.primaryText, textStyle]}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  primary: {
    alignSelf: 'stretch',
    width: '100%',
    minWidth: 180,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',

    ...(Platform.OS === 'ios' && {
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    }),
  },
  primaryPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  primaryDisabled: {
    opacity: 0.55,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
});

export default NativePrimaryFallback;
