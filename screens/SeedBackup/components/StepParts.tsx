/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';

import { space12, space20, space24, space32 } from '@app/theme';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';

export const SIDE = space20;

export const StepTitle: React.FunctionComponent<{
  title: string;
  sub?: string;
}> = ({ title, sub }) => {
  return (
    <View style={{ paddingHorizontal: SIDE, marginBottom: space24 }}>
      <Text
        accessibilityRole="header"
        variant="subtitle"
        style={{
          textAlign: 'center',
          marginHorizontal: space32,
          marginBottom: space12,
        }}
      >
        {title}
      </Text>
      {!!sub && (
        <Text variant="body" tone="muted">
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
