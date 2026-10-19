/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text, View, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';

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
  /** Until the step is complete. */
  disabled?: boolean;
  primaryStyle?: AnimatedStyle<ViewStyle>;
  testID: string;
};

// The bottom pair of every step: the main action on top, the text link below it.
export const StepActions: React.FunctionComponent<StepActionsProps> = ({
  link,
  onLink,
  primary,
  onPrimary,
  disabled,
  primaryStyle,
  testID,
}) => {
  return (
    <View style={{ paddingHorizontal: SIDE }}>
      <ButtonStack>
        <Button
          testID={`${testID}.link`}
          variant="text"
          title={link}
          onPress={onLink}
        />
        <Animated.View style={primaryStyle}>
          <Button
            testID={`${testID}.primary`}
            variant="primary"
            title={primary}
            onPress={onPrimary}
            disabled={disabled}
          />
        </Animated.View>
      </ButtonStack>
    </View>
  );
};
