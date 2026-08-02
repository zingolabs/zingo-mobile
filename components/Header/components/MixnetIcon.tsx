import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import NymOn from '../../../assets/img/nym-on.svg';

const HALO_GREEN = '#07FF94';
const HALO_CORAL = '#FF6F61';

const ICON = 14;
const RING = 22;

export type MixnetPhase = 'connecting' | 'ready' | 'lost';

/**
 * Maps a mixnet status key to the icon phase. `off` (deliberate clearnet)
 * has no icon, so the caller renders nothing on null.
 */
export function mixnetPhase(statusKey: string): MixnetPhase | null {
  switch (statusKey) {
    case 'mixnet.status.ready':
      return 'ready';
    case 'mixnet.status.bootstrapping':
      return 'connecting';
    case 'mixnet.status.died':
    case 'mixnet.status.unknown':
      return 'lost';
    default:
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
    borderRadius: RING / 2,
    borderWidth: 2,
  },
});

const MixnetIcon = ({ phase }: { phase: MixnetPhase }) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== 'connecting') {
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {phase === 'connecting' && (
        <Animated.View
          style={[
            styles.halo,
            {
              borderColor: 'transparent',
              borderTopColor: HALO_GREEN,
              borderRightColor: HALO_GREEN,
              transform: [{ rotate }],
            },
          ]}
        />
      )}
      {phase === 'lost' && (
        <View style={[styles.halo, { borderColor: HALO_CORAL }]} />
      )}
      <NymOn width={ICON} height={ICON} />
    </View>
  );
};

export default MixnetIcon;
