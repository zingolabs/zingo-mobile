/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';

import { useTheme } from '@app/theme';

export const SIDE = 22;

export const StepTitle: React.FunctionComponent<{
  title: string;
  sub?: string;
}> = ({ title, sub }) => {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: SIDE, marginBottom: 22 }}>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.fgDefault,
          fontSize: 18,
          lineHeight: 24,
          fontWeight: '700',
          textAlign: 'center',
          marginHorizontal: 30,
          marginBottom: 14,
        }}
      >
        {title}
      </Text>
      {!!sub && (
        <Text style={{ color: colors.fgMuted, fontSize: 14, lineHeight: 20 }}>
          {sub}
        </Text>
      )}
    </View>
  );
};

type StepActionsProps = {
  link: string;
  onLink: () => void;
  primary: string;
  onPrimary: () => void;
  // Dimmed look while the step is incomplete; the press still lands.
  off?: boolean;
  primaryStyle?: AnimatedStyle<ViewStyle>;
  testID: string;
};

// The bottom pair of every step: a text link on the left, the main pill on the right.
export const StepActions: React.FunctionComponent<StepActionsProps> = ({
  link,
  onLink,
  primary,
  onPrimary,
  off,
  primaryStyle,
  testID,
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SIDE,
        gap: 14,
      }}
    >
      <Pressable
        testID={`${testID}.link`}
        accessibilityRole="button"
        onPress={onLink}
        style={({ pressed }) => ({
          flex: 1,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{ color: colors.fgAccent, fontSize: 15, fontWeight: '700' }}
        >
          {link}
        </Text>
      </Pressable>
      <Animated.View style={[{ flex: 1 }, primaryStyle]}>
        <Pressable
          testID={`${testID}.primary`}
          accessibilityRole="button"
          accessibilityState={{ disabled: off }}
          onPress={onPrimary}
          style={({ pressed }) => ({
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: off ? colors.bgAccentDisabled : colors.bgAccent,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text
            style={{
              color: colors.bgCanvas,
              fontSize: 15,
              fontWeight: '700',
            }}
          >
            {primary}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};
