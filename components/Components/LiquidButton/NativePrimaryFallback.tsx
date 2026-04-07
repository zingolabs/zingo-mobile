import { useTheme } from '@react-navigation/native';
import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Platform,
  TextStyle,
  ColorValue,
  ViewStyle,
  View,
} from 'react-native';
import { ThemeType } from '../../../app/types';

type NativePrimaryFallbackProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  tintColor?: ColorValue;
  testID?: string;
};

const NativePrimaryFallback: React.FC<NativePrimaryFallbackProps> = ({
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

  return (
    <View style={[styles.container, style]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  primary: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 160,
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
