/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { BackHandler, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Extrapolation,
  FadeInUp,
  interpolate,
  interpolateColor,
  ReduceMotion,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowRightLong } from '@fortawesome/free-solid-svg-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum } from '../../app/AppState';

// Pool artwork palette — Orchard teal and Ironwood gold are one-off brand
// accents for this onboarding, not part of the app theme.
const ORCHARD_ACCENT = '#4E8E96';
const ORCHARD_BORDER = '#2E5E66';
const ORCHARD_BG = '#0B1D26';
const IRONWOOD_ACCENT = '#E4C28F';
const IRONWOOD_BORDER = '#5A4630';
const IRONWOOD_BG = '#241A12';
const RING_DARK = '#3A2A1A';
// Faint green fill behind a batch bucket, and the hairline that separates the
// two phase sections — both one-off accents derived from the primary green.
const BATCH_BG = 'rgba(67, 166, 55, 0.10)';
const SECTION_DIVIDER = 'rgba(255, 255, 255, 0.08)';

const STEP_COUNT = 2;

// Critically damped by default (no overshoot); the gesture's release
// velocity is handed to the spring so drag → settle has no visible seam.
const springConfig = (velocity?: number) => {
  'worklet';
  return {
    duration: 500,
    dampingRatio: 1,
    velocity: velocity ?? 0,
    reduceMotion: ReduceMotion.System,
  };
};

// Apple's momentum projection (exponential decay): where would the gesture
// land if it kept decelerating like a scroll view?
const project = (velocity: number) => {
  'worklet';
  return ((velocity / 1000) * 0.998) / (1 - 0.998);
};

// Progressive resistance past the first/last page — the further past the
// bound, the less the strip follows the finger.
const rubberband = (overshoot: number, dimension: number) => {
  'worklet';
  const c = 0.55;
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
};

// Concentric growth rings, the Ironwood pool mark.
const IronwoodRings: React.FunctionComponent<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Circle cx="32" cy="32" r="30" fill={IRONWOOD_ACCENT} />
    <Circle
      cx="32"
      cy="32"
      r="23"
      stroke={RING_DARK}
      strokeWidth="3.5"
      fill="none"
    />
    <Circle
      cx="30"
      cy="34"
      r="15"
      stroke={RING_DARK}
      strokeWidth="3.5"
      fill="none"
    />
    <Circle
      cx="28"
      cy="36"
      r="8"
      stroke={RING_DARK}
      strokeWidth="3.5"
      fill="none"
    />
    <Circle cx="27" cy="37" r="3" fill={RING_DARK} />
  </Svg>
);

type PoolCardProps = {
  variant: 'orchard' | 'ironwood';
  size?: number;
};

const PoolCard: React.FunctionComponent<PoolCardProps> = ({
  variant,
  size = 112,
}) => {
  const orchard = variant === 'orchard';
  const dot = size * 0.19;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.23,
        borderWidth: 1.5,
        borderColor: orchard ? ORCHARD_BORDER : IRONWOOD_BORDER,
        backgroundColor: orchard ? ORCHARD_BG : IRONWOOD_BG,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {orchard ? (
        <View style={{ width: size * 0.5, height: size * 0.5 }}>
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: dot * 0.2,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: ORCHARD_ACCENT,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: ORCHARD_ACCENT,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: size * 0.12,
              bottom: 0,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: ORCHARD_ACCENT,
            }}
          />
        </View>
      ) : (
        <IronwoodRings size={size * 0.55} />
      )}
    </View>
  );
};

type PoolLabelProps = {
  color: string;
  children: string;
};

const PoolLabel: React.FunctionComponent<PoolLabelProps> = ({
  color,
  children,
}) => (
  <Text
    style={{
      color,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 2.5,
      textAlign: 'center',
      marginBottom: 12,
    }}
  >
    {children}
  </Text>
);

// Renders a translated paragraph, bolding the spans wrapped in `**` so a
// single translation string keeps its natural word order per language.
type BodyTextProps = {
  children: string;
  dimColor: string;
  boldColor: string;
  marginBottom?: number;
};

const BodyText: React.FunctionComponent<BodyTextProps> = ({
  children,
  dimColor,
  boldColor,
  marginBottom = 18,
}) => (
  <Text
    style={{
      color: dimColor,
      fontSize: 17,
      lineHeight: 26,
      marginBottom,
    }}
  >
    {children.split('**').map((part: string, i: number) =>
      i % 2 === 1 ? (
        <Text key={i} style={{ color: boldColor, fontWeight: '700' }}>
          {part}
        </Text>
      ) : (
        <Text key={i}>{part}</Text>
      ),
    )}
  </Text>
);

// The per-page heading. It lives inside the strip so it slides with its page
// instead of floating as fixed chrome above the pager.
const PageTitle: React.FunctionComponent<{ children: string }> = ({
  children,
}) => (
  <BoldText
    style={{
      fontSize: 22,
      textAlign: 'center',
      alignSelf: 'stretch',
      marginBottom: 36,
    }}
  >
    {children}
  </BoldText>
);

// Left-aligned, spaced-out uppercase section heading ("PHASE 1 - SPLIT").
const SectionLabel: React.FunctionComponent<{
  color: string;
  children: string;
}> = ({ color, children }) => (
  <Text
    style={{
      color,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.5,
      marginBottom: 16,
    }}
  >
    {children}
  </Text>
);

// A small rounded square — the unit "note" tile used across both phase
// diagrams. Outlined by default; the source tile is filled.
const MiniCard: React.FunctionComponent<{
  size: number;
  color: string;
  fill?: string;
}> = ({ size, color, fill = 'transparent' }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: Math.max(4, size * 0.18),
      borderWidth: 1.5,
      borderColor: color,
      backgroundColor: fill,
    }}
  />
);

// Phase 1 — one balance splits into a standardized grid of equal notes.
const Phase1Graphic: React.FunctionComponent<{
  green: string;
  arrowColor: string;
}> = ({ green, arrowColor }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <View
      style={{
        width: 62,
        height: 62,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: ORCHARD_BORDER,
        backgroundColor: ORCHARD_BG,
      }}
    />
    <FontAwesomeIcon
      icon={faArrowRightLong}
      size={24}
      color={arrowColor}
      style={{ marginHorizontal: 20 }}
    />
    <View
      style={{ width: 104, flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}
    >
      {Array.from({ length: 6 }, (_, i: number) => (
        <MiniCard key={i} size={30} color={green} />
      ))}
    </View>
  </View>
);

// The small quarter-pie badge above each batch — a batch part-way through
// its send window.
const PieBadge: React.FunctionComponent<{ green: string; size?: number }> = ({
  green,
  size = 22,
}) => (
  <Svg width={size} height={size} viewBox="0 0 22 22">
    <Circle
      cx="11"
      cy="11"
      r="8.5"
      stroke={green}
      strokeWidth="1.5"
      fill="none"
    />
    <Path d="M11 11 L11 2.5 A8.5 8.5 0 0 1 19.5 11 Z" fill={green} />
  </Svg>
);

// Phase 2 — one labelled batch: a progress pie over a bucket of notes.
const BatchBucket: React.FunctionComponent<{
  green: string;
  labelColor: string;
  label: string;
}> = ({ green, labelColor, label }) => (
  <View style={{ alignItems: 'center' }}>
    <PieBadge green={green} />
    <View
      style={{
        marginTop: 8,
        flexDirection: 'row',
        gap: 8,
        padding: 10,
        borderRadius: 12,
        backgroundColor: BATCH_BG,
      }}
    >
      <MiniCard size={26} color={green} />
      <MiniCard size={26} color={green} />
    </View>
    <Text style={{ marginTop: 8, color: labelColor, fontSize: 13 }}>
      {label}
    </Text>
  </View>
);

type MeetIronwoodProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MeetIronwood
>;

const MeetIronwood: React.FunctionComponent<MeetIronwoodProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme() as ThemeType;
  const { width } = useWindowDimensions();

  // One shared value drives everything: the strip position, the per-page
  // parallax/fade and the dots all derive from it, so a swipe, a button
  // press or an interrupted settle stay continuous and grabbable.
  const offset = useSharedValue(0);
  const grabX = useSharedValue(0);
  const activeIndex = useSharedValue(0);
  const panEnded = useSharedValue(true);
  const [index, setIndex] = useState(0);

  const progress = useDerivedValue(() => -offset.value / width);

  // Keep the strip anchored to the current page if the window resizes.
  // `index` is only a dependency for correctness of the target — acting on
  // its changes here would cancel the spring `goTo` just started.
  const prevWidth = useRef(width);
  useEffect(() => {
    if (prevWidth.current !== width) {
      prevWidth.current = width;
      cancelAnimation(offset);
      offset.value = -index * width;
    }
  }, [width, index, offset]);

  const goTo = useCallback(
    (i: number) => {
      const target = Math.max(0, Math.min(STEP_COUNT - 1, i));
      setIndex(target);
      activeIndex.value = target;
      offset.value = withSpring(-target * width, springConfig());
    },
    [activeIndex, offset, width],
  );

  // The onboarding is a one-way flow. Closing resets the inner stack to Home
  // rather than popping, so you can't land back on the screen underneath, and
  // once closed the onboarding isn't left on the stack to return to.
  const closeScreen = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: RouteEnum.HomeStack }] });
  }, [navigation]);

  const onPrimary = useCallback(() => {
    if (index < STEP_COUNT - 1) {
      goTo(index + 1);
    } else {
      // Last onboarding step continues into the migration flow rather than
      // closing. The migration screens end the flow (reset to Home) once the
      // user accepts or backs all the way out.
      navigation.navigate(RouteEnum.MigrationStrategy);
    }
  }, [index, goTo, navigation]);

  // While onboarding is focused, the Android hardware back button closes it
  // (same as finishing) instead of popping to the screen behind it.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        closeScreen();
        return true;
      });
      return () => sub.remove();
    }, [closeScreen]),
  );

  const pan = Gesture.Pan()
    // ~12px of hysteresis before the pager claims the gesture.
    .activeOffsetX([-12, 12])
    .onBegin(() => {
      // grab a moving strip mid-flight: stop the spring and continue from
      // the presentation value.
      cancelAnimation(offset);
      grabX.value = offset.value;
      panEnded.value = false;
    })
    .onUpdate(e => {
      const raw = grabX.value + e.translationX;
      const min = -(STEP_COUNT - 1) * width;
      if (raw > 0) {
        offset.value = rubberband(raw, width);
      } else if (raw < min) {
        offset.value = min + rubberband(raw - min, width);
      } else {
        offset.value = raw;
      }
    })
    .onEnd(e => {
      // snap to the page the momentum is heading for, one page at a time.
      const projected = offset.value + project(e.velocityX);
      let target = Math.round(-projected / width);
      target = Math.max(
        activeIndex.value - 1,
        Math.min(activeIndex.value + 1, target),
      );
      target = Math.max(0, Math.min(STEP_COUNT - 1, target));
      activeIndex.value = target;
      panEnded.value = true;
      runOnJS(setIndex)(target);
      offset.value = withSpring(-target * width, springConfig(e.velocityX));
    })
    .onFinalize(() => {
      // a touch that never activated the pan (a tap on a settling strip)
      // still cancelled the spring in onBegin — resume it.
      if (!panEnded.value) {
        panEnded.value = true;
        offset.value = withSpring(-activeIndex.value * width, springConfig());
      }
    });

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const steps: React.ReactNode[] = [
    <View key="pools" style={{ alignItems: 'center' }}>
      <PageTitle>{translate('meetironwood.title') as string}</PageTitle>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 44,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <PoolLabel color={ORCHARD_ACCENT}>
            {translate('meetironwood.orchard') as string}
          </PoolLabel>
          <PoolCard variant="orchard" />
        </View>
        <FontAwesomeIcon
          icon={faArrowRightLong}
          size={26}
          color={colors.text}
          style={{ marginHorizontal: 22, marginTop: 25 }}
        />
        <View style={{ alignItems: 'center' }}>
          <PoolLabel color={IRONWOOD_ACCENT}>
            {translate('meetironwood.ironwood') as string}
          </PoolLabel>
          <PoolCard variant="ironwood" />
        </View>
      </View>
      <View style={{ alignSelf: 'stretch' }}>
        <BodyText dimColor={colors.placeholder} boldColor={colors.text}>
          {translate('meetironwood.step1-body-1') as string}
        </BodyText>
        <BodyText dimColor={colors.placeholder} boldColor={colors.text}>
          {translate('meetironwood.step1-body-2') as string}
        </BodyText>
      </View>
    </View>,
    <View key="how" style={{ alignSelf: 'stretch' }}>
      <PageTitle>{translate('meetironwood.title2') as string}</PageTitle>
      <SectionLabel color={colors.text}>
        {translate('meetironwood.phase1-label') as string}
      </SectionLabel>
      <View style={{ marginBottom: 18 }}>
        <Phase1Graphic green={colors.primary} arrowColor={colors.text} />
      </View>
      <BodyText
        dimColor={colors.placeholder}
        boldColor={colors.text}
        marginBottom={4}
      >
        {translate('meetironwood.phase1-body') as string}
      </BodyText>

      <View
        style={{
          height: 1,
          backgroundColor: SECTION_DIVIDER,
          marginVertical: 22,
        }}
      />

      <SectionLabel color={colors.text}>
        {translate('meetironwood.phase2-label') as string}
      </SectionLabel>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 4,
          marginBottom: 18,
        }}
      >
        {[1, 2, 3].map((n: number) => (
          <BatchBucket
            key={n}
            green={colors.primary}
            labelColor={colors.placeholder}
            label={`${translate('meetironwood.bucket') as string} ${n}`}
          />
        ))}
      </View>
      <BodyText
        dimColor={colors.placeholder}
        boldColor={colors.text}
        marginBottom={0}
      >
        {translate('meetironwood.phase2-body') as string}
      </BodyText>
    </View>,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <GestureDetector gesture={pan}>
        <Animated.View
          entering={FadeInUp.duration(420)
            .withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
            .reduceMotion(ReduceMotion.System)}
          style={{ marginTop: 24, overflow: 'hidden' }}
        >
          <Animated.View
            style={[
              {
                flexDirection: 'row',
                width: width * STEP_COUNT,
                alignItems: 'flex-start',
              },
              stripStyle,
            ]}
          >
            {steps.map((step: React.ReactNode, i: number) => (
              <PagerPage key={i} i={i} width={width} progress={progress}>
                {step}
              </PagerPage>
            ))}
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Spacer pushes the pager down so the dots + buttons sit at the bottom
          at a fixed level, independent of each page's content height. */}
      <View style={{ flex: 1 }} />

      <Animated.View
        entering={FadeInUp.duration(420)
          .delay(140)
          .withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
          .reduceMotion(ReduceMotion.System)}
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          marginBottom: 20,
          gap: 8,
        }}
      >
        {Array.from({ length: STEP_COUNT }, (_, i: number) => (
          <PagerDot
            key={i}
            i={i}
            progress={progress}
            activeColor={colors.primary}
            inactiveColor={colors.placeholder}
          />
        ))}
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(420)
          .delay(200)
          .withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
          .reduceMotion(ReduceMotion.System)}
        style={{
          paddingBottom: 24,
          paddingHorizontal: 24,
        }}
      >
        {index === 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Button
              testID="meetironwood.primary"
              type={ButtonTypeEnum.Primary}
              title={translate('meetironwood.next') as string}
              onPress={onPrimary}
            />
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              alignItems: 'center',
            }}
          >
            <Button
              testID="meetironwood.back"
              type={ButtonTypeEnum.Ghost}
              title={translate('meetironwood.back') as string}
              onPress={() => goTo(index - 1)}
              twoButtons={true}
            />
            <Button
              testID="meetironwood.primary"
              type={ButtonTypeEnum.Primary}
              title={translate('meetironwood.next') as string}
              onPress={onPrimary}
              twoButtons={true}
            />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

// A page of the strip: fades and slightly lags while it leaves the
// viewport, hinting where the motion is going.
type PagerPageProps = {
  i: number;
  width: number;
  progress: SharedValue<number>;
  children: React.ReactNode;
};

const PagerPage: React.FunctionComponent<PagerPageProps> = ({
  i,
  width,
  progress,
  children,
}) => {
  const style = useAnimatedStyle(() => {
    const distance = progress.value - i;
    return {
      opacity: interpolate(
        Math.abs(distance),
        [0, 1],
        [1, 0.35],
        Extrapolation.CLAMP,
      ),
      transform: [{ translateX: distance * 16 }],
    };
  });
  return (
    <Animated.View style={[{ width, paddingHorizontal: 30 }, style]}>
      {children}
    </Animated.View>
  );
};

// Page indicator: the active dot stretches into a pill, tracking the swipe
// 1:1 instead of flipping at the end.
type PagerDotProps = {
  i: number;
  progress: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
};

const PagerDot: React.FunctionComponent<PagerDotProps> = ({
  i,
  progress,
  activeColor,
  inactiveColor,
}) => {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(progress.value - i);
    return {
      width: interpolate(distance, [0, 1], [24, 8], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(
        Math.min(distance, 1),
        [0, 1],
        [activeColor, inactiveColor],
      ),
    };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4 }, style]} />;
};

export default MeetIronwood;
