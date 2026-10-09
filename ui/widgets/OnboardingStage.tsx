/* eslint-disable react-native/no-inline-styles */
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  Keyframe,
  ReduceMotion,
} from 'react-native-reanimated';
import type {
  ParamListBase,
  StackNavigationState,
} from '@react-navigation/native';

import { useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { RouteEnum } from '@app/AppState';
import type { OnboardingDescriptor } from '@app/navigation/OnboardingNavigator';
import WelcomeBranches from '@ui/widgets/WelcomeBranches';

type OnboardingStageProps = {
  state: StackNavigationState<ParamListBase>;
  descriptors: Record<string, OnboardingDescriptor>;
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

const depth = (screen: string): number => {
  switch (screen) {
    case RouteEnum.Welcome:
    case RouteEnum.OpenError:
      return 0;
    case RouteEnum.ImportChooser:
    case RouteEnum.Server:
      return 1;
    case RouteEnum.Progress:
      return 3;
    default:
      return 2;
  }
};

// Leaving or returning to the welcome parts or returns the leaves; the
// progress and error screens fade in whole; everything else inside the
// import stack moves on the shared axis.
const enterFor = (from: string | undefined, to: string) => {
  if (to === RouteEnum.Welcome) {
    return welcomeEnter();
  }
  if (to === RouteEnum.Progress) {
    return importingEnter();
  }
  if (to === RouteEnum.OpenError) {
    return errorEnter();
  }
  if (from === undefined || from === RouteEnum.Welcome) {
    return formEnter();
  }
  return axisEnter(depth(to) > depth(from) ? AXIS_PT : -AXIS_PT);
};

const exitFor = (from: string, to: string) => {
  if (from === RouteEnum.Welcome) {
    return welcomeExit();
  }
  if (from === RouteEnum.Progress) {
    return importingExit();
  }
  if (to === RouteEnum.Welcome) {
    return formExit();
  }
  if (to === RouteEnum.Progress) {
    return recedeExit();
  }
  return axisExit(depth(to) > depth(from) ? -AXIS_PT : AXIS_PT);
};

// The view of the onboarding navigator: only the focused route is on stage.
// The hosted route lags the focused one by one render so the leaving view is
// told where it is going before it unmounts.
const OnboardingStage: React.FunctionComponent<OnboardingStageProps> = ({
  state,
  descriptors,
}) => {
  const { colors } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const focused = state.routes[state.index];
  const [shown, setShown] = useState(focused);
  const previous = useRef<string | undefined>(undefined);

  if (shown.key !== focused.key) {
    previous.current = shown.name;
    setShown(focused);
  }

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
        parted={focused.name !== RouteEnum.Welcome}
      />
      <Animated.View
        key={shown.key}
        entering={enterFor(previous.current, shown.name)}
        exiting={exitFor(shown.name, focused.name)}
        style={{ flex: 1 }}
      >
        {descriptors[shown.key]?.render()}
      </Animated.View>
    </View>
  );
};

export default OnboardingStage;
