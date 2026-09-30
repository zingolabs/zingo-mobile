/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  ReduceMotion,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { RouteEnum } from '@app/AppState';
import WelcomeBranches from '@ui/widgets/WelcomeBranches';

type OnboardingStageProps = {
  screen: RouteEnum;
  children: React.ReactNode;
};

const BRANCH_AREA_RATIO = 0.34;
const BRANCH_AREA_MAX = 260;

const welcomeEnter = () =>
  FadeIn.duration(300).delay(520).reduceMotion(ReduceMotion.System);
const welcomeExit = () =>
  FadeOutUp.duration(240)
    .easing(ease.in)
    .withInitialValues({ transform: [{ translateY: 0 }] })
    .reduceMotion(ReduceMotion.System);
const formEnter = () =>
  FadeInUp.duration(320)
    .delay(240)
    .easing(ease.out)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 16 }] })
    .reduceMotion(ReduceMotion.System);
const formExit = () =>
  FadeOutDown.duration(duration.base)
    .easing(ease.in)
    .reduceMotion(ReduceMotion.System);

const OnboardingStage: React.FunctionComponent<OnboardingStageProps> = ({
  screen,
  children,
}) => {
  const { colors } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const welcome = screen === RouteEnum.StartMenu;

  return (
    <View
      testID="onboarding.stage"
      onLayout={e =>
        setSize({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
    >
      <WelcomeBranches
        width={size.w}
        height={Math.min(size.h * BRANCH_AREA_RATIO, BRANCH_AREA_MAX)}
        parted={!welcome}
      />
      <Animated.View
        key={screen}
        entering={welcome ? welcomeEnter() : formEnter()}
        exiting={welcome ? welcomeExit() : formExit()}
        style={{ flex: 1 }}
      >
        {children}
      </Animated.View>
    </View>
  );
};

export default OnboardingStage;
