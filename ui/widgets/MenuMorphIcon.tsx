import React, { useEffect } from 'react';
import Animated, {
  SharedValue,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useOptionsPanel } from '@app/context/optionsPanel';
import {
  SLIDE_DURATION_MS,
  SLIDE_EASING,
} from '@app/hooks/useOptionsPanelSheetSlide';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BAR_X0 = 2.6;
const BAR_X1 = 22.4;
const BAR_YS = [5.21, 12.5, 19.79];
const STROKE = 3.125;

const CHEV_X0 = 3.8;
const CHEV_X1 = 21.2;
const CHEV_APEX_X = 12.5;
const CHEV_APEX_YS = [3.3, 10.3, 17.3];
const CHEV_DROP = 4.5;

const lerp = (from: number, to: number, t: number) => {
  'worklet';
  return from + (to - from) * t;
};

type MorphLineProps = {
  index: number;
  progress: SharedValue<number>;
  color: string;
};

const MorphLine = ({ index, progress, color }: MorphLineProps) => {
  const animatedProps = useAnimatedProps(() => {
    const t = progress.value;
    const x0 = lerp(BAR_X0, CHEV_X0, t);
    const x1 = lerp(BAR_X1, CHEV_X1, t);
    const yApex = lerp(BAR_YS[index], CHEV_APEX_YS[index], t);
    const yEnd = lerp(BAR_YS[index], CHEV_APEX_YS[index] + CHEV_DROP, t);
    return {
      d: `M ${x0} ${yEnd} L ${CHEV_APEX_X} ${yApex} L ${x1} ${yEnd}`,
    };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
};

type MenuMorphIconProps = {
  size?: number;
  color?: string;
};

export const MenuMorphIcon = ({
  size = 25,
  color = '#B1BBC5',
}: MenuMorphIconProps) => {
  const { isOpen } = useOptionsPanel();
  const progress = useSharedValue(isOpen ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, {
      duration: SLIDE_DURATION_MS,
      easing: SLIDE_EASING,
    });
  }, [isOpen, progress]);

  return (
    <Svg width={size} height={size} viewBox="0 0 25 25">
      {[0, 1, 2].map(line => (
        <MorphLine key={line} index={line} progress={progress} color={color} />
      ))}
    </Svg>
  );
};
