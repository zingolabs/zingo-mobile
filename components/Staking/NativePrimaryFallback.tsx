import { useTheme } from '@react-navigation/native';
import React from 'react';
import { Pressable, Text, StyleSheet, Platform } from 'react-native';
import { ThemeType } from '../../app/types/ThemeType';

type NativePrimaryFallbackProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

const NativePrimaryFallback: React.FC<NativePrimaryFallbackProps> = ({
  title,
  onPress,
  disabled,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: colors.primary },
        pressed && !disabled && styles.primaryPressed,
        disabled && styles.primaryDisabled,
      ]}
    >
      <Text style={styles.primaryText}>{title}</Text>
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
