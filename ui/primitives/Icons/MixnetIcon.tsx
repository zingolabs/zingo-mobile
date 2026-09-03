import React, { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import NymOn from '../../../assets/img/nym-on.svg';
import { MixnetStatusKey } from '@app/walletBackend/transforms/mixnetView';

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

export type MixnetPhase = 'connecting' | 'ready' | 'lost' | 'reconnecting';

/**
 * Maps a status key and the recovery flag to the icon phase. `off`
 * (deliberate clearnet) has no icon, so the caller renders nothing on null.
 * An active reconnect wins over the underlying status so the whole
 * loss-recovery cycle reads as one animated state.
 */
export function mixnetPhase(
  statusKey: MixnetStatusKey,
  reconnecting: boolean,
): MixnetPhase | null {
  if (statusKey === 'mixnet.status.ready') {
    return 'ready';
  }
  if (reconnecting) {
    return 'reconnecting';
  }
  switch (statusKey) {
    case 'mixnet.status.bootstrapping':
      return 'connecting';
    case 'mixnet.status.died':
    case 'mixnet.status.unknown':
      return 'lost';
    case 'mixnet.status.off':
      return null;
  }
}

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

const MixnetIcon = ({ phase }: { phase: MixnetPhase }) => {
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
