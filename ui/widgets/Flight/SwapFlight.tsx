/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  ReduceMotion,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@app/theme';
import type { SwapAssetType } from '@app/swap';
import Text from '@ui/primitives/Text';
import { SwapIcon } from '@ui/primitives/Icons/SwapIcon';
import TokenLogo from '@screens/Swap/components/TokenLogo';
import { tokenEntryOf } from '@screens/Swap/swapAssets';
import NymOn from '../../../assets/img/nym-on.svg';
import { samplePath } from './pathPoints';
import MixNode, { NODE_DIM } from './MixNode';

/** One trip of the token from coin to coin, in ms. */
const TRIP_MS = 1900;
const LEG_IN = 'M46 150 C 60 90 100 60 150 60';
const LEG_OUT = 'M150 60 C 200 60 240 90 254 150';
const ROUTE = samplePath(
  [
    [
      [46, 150],
      [60, 90],
      [100, 60],
      [150, 60],
    ],
    [
      [150, 60],
      [200, 60],
      [240, 90],
      [254, 150],
    ],
  ],
  48,
);
const STOPS = ROUTE.points.map((_, i) => i / (ROUTE.points.length - 1));
const XS = ROUTE.points.map(p => p.x - 7);
const YS = ROUTE.points.map(p => p.y - 7);
/** Selling ZEC, the first leg crosses two mix nodes before the provider. */
const NODES = [
  { x: 74, y: 92, at: 0.18 },
  { x: 115, y: 66, at: 0.36 },
];

/**
 * A swap on its way, drawn: the coin you send on the left, the one you get
 * on the right, the provider in the middle, and a token that leaves in the
 * colour of one and arrives in the colour of the other. Selling ZEC, the
 * first leg goes through NYM and lights its mix nodes. 300 x 200, scaled
 * down to `width` when narrower.
 */
export default function SwapFlight({
  from,
  to,
  provider,
  nym,
  width = 300,
}: {
  from: SwapAssetType;
  to: SwapAssetType;
  provider: string;
  /** The first leg goes through the mixnet: selling ZEC. */
  nym: boolean;
  width?: number;
}) {
  const { colors } = useTheme();
  const clock = useSharedValue(0);
  const trip = useSharedValue(0);
  /** ZEC travels in the accent green; the other coin in the text colour. */
  const coinColor = (asset: SwapAssetType) =>
    asset.chain.toUpperCase() === 'ZEC' ? colors.fgAccent : colors.fgDefault;
  const startColor = coinColor(from);
  const endColor = coinColor(to);

  useEffect(() => {
    clock.value = withRepeat(
      withTiming(1, {
        duration: TRIP_MS,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
    );
    trip.value = withRepeat(
      withTiming(1, {
        duration: TRIP_MS,
        easing: Easing.bezier(0.45, 0, 0.25, 1),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
    );
  }, [clock, trip]);

  const token = useAnimatedStyle(() => {
    const p = trip.value;
    return {
      opacity: interpolate(p, [0, 0.12, 0.86, 1], [0, 1, 1, 0]),
      backgroundColor: interpolateColor(
        p,
        [0, 0.45, 0.55, 1],
        [startColor, startColor, endColor, endColor],
      ),
      transform: [
        { translateX: interpolate(p, STOPS, XS) },
        { translateY: interpolate(p, STOPS, YS) },
        { scale: interpolate(p, [0, 0.12, 1], [0.6, 1, 0.7]) },
      ],
    };
  });

  const coin = (asset: SwapAssetType, left: number) => (
    <View
      style={{
        position: 'absolute',
        left: left - 5,
        top: 123,
        padding: 4,
        borderRadius: 27,
        borderWidth: 1,
        borderColor: NODE_DIM,
        backgroundColor: colors.bgSurface,
      }}
    >
      <TokenLogo
        token={tokenEntryOf(asset)}
        size={44}
        surfaceColor={colors.bgSurface}
      />
    </View>
  );

  const scale = Math.min(1, width / 300);
  return (
    <View
      testID="swap.flight"
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={{ width: 300 * scale, height: 200 * scale }}
    >
      <View
        style={{
          width: 300,
          height: 200,
          transform: [{ scale }],
          transformOrigin: 'top left',
        }}
      >
        <Svg
          width={300}
          height={200}
          viewBox="0 0 300 200"
          style={{ position: 'absolute', overflow: 'visible' }}
        >
          <Path
            d={LEG_IN}
            fill="none"
            stroke={nym ? colors.bgNym : NODE_DIM}
            strokeOpacity={nym ? 0.55 : 1}
            strokeWidth={2}
            strokeDasharray={[1, 7]}
            strokeLinecap="round"
          />
          <Path
            d={LEG_OUT}
            fill="none"
            stroke={NODE_DIM}
            strokeWidth={2}
            strokeDasharray={[1, 7]}
            strokeLinecap="round"
          />
          {nym &&
            NODES.map(node => (
              <MixNode key={node.at} {...node} clock={clock} />
            ))}
        </Svg>
        {coin(from, 24)}
        {coin(to, 232)}
        <View
          style={{
            position: 'absolute',
            left: 132,
            top: 42,
            width: 36,
            height: 36,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: NODE_DIM,
            backgroundColor: colors.bgCanvas,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SwapIcon size={18} color={colors.fgMuted} />
        </View>
        <Text
          numberOfLines={1}
          style={{
            position: 'absolute',
            left: 100,
            top: 84,
            width: 100,
            textAlign: 'center',
            fontSize: 11,
            lineHeight: 14,
            fontWeight: '600',
            color: colors.fgMuted,
          }}
        >
          {provider}
        </Text>
        {nym && (
          <View
            style={{
              position: 'absolute',
              left: 22,
              top: 70,
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: 4,
            }}
          >
            <NymOn width={12} height={12} />
            <Text
              style={{
                fontSize: 10,
                lineHeight: 12,
                fontWeight: '700',
                letterSpacing: 0.6,
                color: colors.bgNym,
              }}
            >
              NYM
            </Text>
          </View>
        )}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: 14,
              height: 14,
              borderRadius: 7,
            },
            token,
          ]}
        />
      </View>
    </View>
  );
}
