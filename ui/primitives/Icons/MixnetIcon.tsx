import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import NymOn from '../../../assets/img/nym-on.svg';

const HALO_GREEN = '#07FF94';
const HALO_CORAL = '#FF6F61';
const HALO_YELLOW = '#FFC400';

const ICON = 14;
const RING = 22;
const STROKE = 2;
const RADIUS = 6;

const SIDE = RING - STROKE;
const PERIMETER = 4 * (SIDE - 2 * RADIUS) + 2 * Math.PI * RADIUS;
const LIT_ARC = PERIMETER * 0.32;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const travel = new Animated.Value(0);
let activeAnimators = 0;
let sharedLoop: Animated.CompositeAnimation | null = null;

function retainArc(): void {
  activeAnimators += 1;
  if (sharedLoop === null) {
    travel.setValue(0);
    sharedLoop = Animated.loop(
      Animated.timing(travel, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    sharedLoop.start();
  }
}

function releaseArc(): void {
  activeAnimators -= 1;
  if (activeAnimators <= 0) {
    activeAnimators = 0;
    sharedLoop?.stop();
    sharedLoop = null;
  }
}

const dashOffset = travel.interpolate({
  inputRange: [0, 1],
  outputRange: [0, -PERIMETER],
});

export type MixnetIconPhase = 'connecting' | 'ready' | 'lost' | 'reconnecting';

const styles = StyleSheet.create({
  container: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: RING,
    height: RING,
  },
});

const HaloRect = ({ color }: { color: string }) => (
  <Svg width={RING} height={RING} style={styles.halo}>
    <Rect
      x={STROKE / 2}
      y={STROKE / 2}
      width={SIDE}
      height={SIDE}
      rx={RADIUS}
      ry={RADIUS}
      stroke={color}
      strokeWidth={STROKE}
      fill="none"
    />
  </Svg>
);

const MixnetIcon = ({ phase }: { phase: MixnetIconPhase }) => {
  const animating = phase === 'connecting' || phase === 'reconnecting';

  useEffect(() => {
    if (!animating) {
      return;
    }
    retainArc();
    return releaseArc;
  }, [animating]);

  return (
    <View style={styles.container}>
      {animating && (
        <Svg width={RING} height={RING} style={styles.halo}>
          <AnimatedRect
            x={STROKE / 2}
            y={STROKE / 2}
            width={SIDE}
            height={SIDE}
            rx={RADIUS}
            ry={RADIUS}
            stroke={phase === 'reconnecting' ? HALO_YELLOW : HALO_GREEN}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${LIT_ARC}, ${PERIMETER - LIT_ARC}`}
            strokeDashoffset={dashOffset}
          />
        </Svg>
      )}
      {phase === 'lost' && <HaloRect color={HALO_CORAL} />}
      <NymOn width={ICON} height={ICON} />
    </View>
  );
};

export default MixnetIcon;
