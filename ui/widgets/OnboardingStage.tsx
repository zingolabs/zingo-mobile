/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  Keyframe,
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
  new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    100: { opacity: 0, transform: [{ translateY: 8 }, { scale: 0.97 }] },
  })
    .duration(duration.base)
    .reduceMotion(ReduceMotion.System);
const importingEnter = () =>
  FadeIn.duration(duration.screen)
    .easing(ease.emphasized)
    .withInitialValues({ opacity: 0, transform: [{ scale: 1.04 }] })
    .reduceMotion(ReduceMotion.System);
const importingExit = () =>
  FadeOut.duration(duration.base).reduceMotion(ReduceMotion.System);

const OnboardingStage: React.FunctionComponent<OnboardingStageProps> = ({
  screen,
  children,
}) => {
  const { colors } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const welcome = screen === RouteEnum.StartMenu;
  const importing = screen === RouteEnum.WalletProgress;

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
      <WelcomeBranches width={size.w} height={size.h} parted={!welcome} />
      <Animated.View
        key={screen}
        entering={
          welcome ? welcomeEnter() : importing ? importingEnter() : formEnter()
        }
        exiting={
          welcome ? welcomeExit() : importing ? importingExit() : formExit()
        }
        style={{ flex: 1 }}
      >
        {children}
      </Animated.View>
    </View>
  );
};

export default OnboardingStage;
