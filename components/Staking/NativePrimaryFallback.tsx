import { useTheme } from '@react-navigation/native';
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
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
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: colors.primary },
        pressed && styles.primaryPressed,
        disabled && styles.primaryDisabled,
      ]}
    >
      <Text style={styles.primaryText}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  primary: {
    minWidth: 180,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: {
    opacity: 0.7,
  },
  primaryDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
});

export default NativePrimaryFallback;
