/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
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

export const AXIS_PT = 30;
const AXIS_OVERLAP_MS = 90;

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
    0: { opacity: 1, transform: [{ translateY: 0 }] },
    100: { opacity: 0, transform: [{ translateY: 8 }], easing: ease.in },
  })
    .duration(duration.base)
    .reduceMotion(ReduceMotion.System);
const recedeExit = () =>
  new Keyframe({
    0: { opacity: 1, transform: [{ scale: 1 }] },
    100: { opacity: 0, transform: [{ scale: 0.96 }], easing: ease.emphasized },
  })
    .duration(duration.screen)
    .reduceMotion(ReduceMotion.System);
const importingEnter = () =>
  FadeIn.duration(duration.screen)
    .easing(ease.emphasized)
    .withInitialValues({ opacity: 0, transform: [{ scale: 1.04 }] })
    .reduceMotion(ReduceMotion.System);
const errorEnter = () =>
  FadeIn.duration(300).easing(ease.standard).reduceMotion(ReduceMotion.System);
const importingExit = () =>
  FadeOut.duration(duration.base).reduceMotion(ReduceMotion.System);
export const axisEnter = (fromX: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateX: fromX }] },
    100: { opacity: 1, transform: [{ translateX: 0 }], easing: ease.out },
  })
    .duration(duration.axis)
    .delay(AXIS_OVERLAP_MS)
    .reduceMotion(ReduceMotion.System);
export const axisExit = (toX: number) =>
  new Keyframe({
    0: { opacity: 1, transform: [{ translateX: 0 }] },
    100: { opacity: 0, transform: [{ translateX: toX }], easing: ease.in },
  })
    .duration(duration.axisOut)
    .reduceMotion(ReduceMotion.System);

const depth = (screen: RouteEnum): number => {
  switch (screen) {
    case RouteEnum.StartMenu:
    case RouteEnum.WalletError:
      return 0;
    case RouteEnum.ImportChooser:
    case RouteEnum.Server:
      return 1;
    case RouteEnum.WalletProgress:
      return 3;
    default:
      return 2;
  }
};

// Leaving or returning to the welcome parts or returns the leaves; the
// progress and error screens fade in whole; everything else inside the
// import stack moves on the shared axis.
const enterFor = (from: RouteEnum | null, to: RouteEnum) => {
  if (to === RouteEnum.StartMenu) {
    return welcomeEnter();
  }
  if (to === RouteEnum.WalletProgress) {
    return importingEnter();
  }
  if (to === RouteEnum.WalletError) {
    return errorEnter();
  }
  if (from === null || from === RouteEnum.StartMenu) {
    return formEnter();
  }
  return axisEnter(depth(to) > depth(from) ? AXIS_PT : -AXIS_PT);
};

const exitFor = (from: RouteEnum, to: RouteEnum) => {
  if (from === RouteEnum.StartMenu) {
    return welcomeExit();
  }
  if (from === RouteEnum.WalletProgress) {
    return importingExit();
  }
  if (to === RouteEnum.StartMenu) {
    return formExit();
  }
  if (to === RouteEnum.WalletProgress) {
    return recedeExit();
  }
  return axisExit(depth(to) > depth(from) ? -AXIS_PT : AXIS_PT);
};

// The hosted screen lags the requested one by one render so the leaving
// view is told where it is going before it unmounts.
const OnboardingStage: React.FunctionComponent<OnboardingStageProps> = ({
  screen,
  children,
}) => {
  const { colors } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [shown, setShown] = useState<RouteEnum>(screen);
  const shownChildren = useRef<React.ReactNode>(children);
  const previous = useRef<RouteEnum | null>(null);

  if (shown === screen) {
    shownChildren.current = children;
  }

  useEffect(() => {
    if (shown !== screen) {
      previous.current = shown;
      setShown(screen);
    }
  }, [screen, shown]);

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
        height={size.h}
        parted={screen !== RouteEnum.StartMenu}
      />
      <Animated.View
        key={shown}
        entering={enterFor(previous.current, shown)}
        exiting={exitFor(shown, screen)}
        style={{ flex: 1 }}
      >
        {shownChildren.current}
      </Animated.View>
    </View>
  );
};

export default OnboardingStage;
