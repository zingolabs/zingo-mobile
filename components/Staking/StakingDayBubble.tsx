/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import ClockActiveWithCheck from '../../assets/icons/clock-active-with-check.svg';
import TriangleYellow from '../../assets/icons/triangle-yellow.svg';
import { ContextAppLoaded } from '../../app/context';
import RegText from '../Components/RegText';

const TAG_HEIGHT = 50;
const COLLAPSED_SIZE = 52;
const EXPANDED_WIDTH = 210;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CENTER_LEFT = (SCREEN_WIDTH - EXPANDED_WIDTH) / 2;

const CollapseMockIcon = () => (
  <View style={styles.collapseMockIcon}>
    <View style={styles.collapseMockIconLine} />
    <View style={[styles.collapseMockIconLine, { marginTop: 3 }]} />
  </View>
);

const StakingDayBubble: React.FC = () => {
  const context = useContext(ContextAppLoaded);
  const { stakingDay, timeToStakingDaySeconds, timeLeftStakingDaySeconds } =
    context;

  const [expanded, setExpanded] = useState(false);
  const [anchorX, setAnchorX] = useState(0);

  const leftAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.25)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(-8)).current;

  const anchorCenterX = anchorX + COLLAPSED_SIZE / 2;
  const expandedStartLeft = anchorCenterX - EXPANDED_WIDTH / 2;

  useEffect(() => {
    if (expanded) {
      leftAnim.setValue(expandedStartLeft);
      scaleAnim.setValue(COLLAPSED_SIZE / EXPANDED_WIDTH);
      opacityAnim.setValue(1);
      contentOpacity.setValue(0);
      contentTranslate.setValue(-8);

      Animated.parallel([
        Animated.timing(leftAnim, {
          toValue: CENTER_LEFT,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 180,
          delay: 80,
          useNativeDriver: false,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 90,
          useNativeDriver: false,
        }),
        Animated.timing(contentTranslate, {
          toValue: -8,
          duration: 120,
          useNativeDriver: false,
        }),
        Animated.timing(leftAnim, {
          toValue: expandedStartLeft,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: COLLAPSED_SIZE / EXPANDED_WIDTH,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 140,
          delay: 80,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [
    expanded,
    expandedStartLeft,
    leftAnim,
    scaleAnim,
    opacityAnim,
    contentOpacity,
    contentTranslate,
  ]);

  const isCalculating = useMemo(() => {
    const value = stakingDay
      ? timeLeftStakingDaySeconds
      : timeToStakingDaySeconds;
    return value === 0;
  }, [stakingDay, timeLeftStakingDaySeconds, timeToStakingDaySeconds]);

  const mainValue = stakingDay
    ? timeLeftStakingDaySeconds
    : timeToStakingDaySeconds;
  const title = stakingDay ? 'Staking day active' : 'Staking day inactive';
  const gradientColors = [stakingDay ? '#002309' : '#553000', '#272727'];

  return (
    <View
      style={styles.root}
      onLayout={e => {
        setAnchorX(e.nativeEvent.layout.x);
      }}
    >
      {/* Small bubble */}
      <Pressable
        onPress={() => setExpanded(prev => !prev)}
        style={styles.anchorPressable}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.smallBubble}
        >
          {expanded ? (
            <CollapseMockIcon />
          ) : stakingDay ? (
            <ClockActiveWithCheck width={28} height={28} />
          ) : (
            <TriangleYellow width={28} height={28} />
          )}
        </LinearGradient>
      </Pressable>

      {/* Expanded bubble */}
      <Animated.View
        pointerEvents={expanded ? 'auto' : 'none'}
        style={[
          styles.expandedLayer,
          {
            left: leftAnim,
            opacity: opacityAnim,
            transform: [{ scaleX: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.expandedBubble}
        >
          <View style={styles.expandedIconWrapper}>
            {stakingDay ? (
              <ClockActiveWithCheck width={28} height={28} />
            ) : (
              <TriangleYellow width={28} height={28} />
            )}
          </View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.textOverlay,
              {
                opacity: contentOpacity,
                transform: [{ translateX: contentTranslate }],
              },
            ]}
          >
            <RegText
              numberOfLines={1}
              ellipsizeMode="clip"
              style={[styles.valueText, isCalculating && styles.valueTextSmall]}
            >
              {isCalculating ? 'calculating...' : mainValue}
            </RegText>

            <RegText numberOfLines={1} style={styles.labelText}>
              {title}
            </RegText>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    height: TAG_HEIGHT,
    justifyContent: 'center',
  },

  anchorPressable: {
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
    zIndex: 3,
  },

  smallBubble: {
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  expandedLayer: {
    position: 'absolute',
    top: 0,
    width: EXPANDED_WIDTH,
    height: TAG_HEIGHT,
    zIndex: 2,
  },

  expandedBubble: {
    width: EXPANDED_WIDTH,
    height: TAG_HEIGHT,
    borderRadius: 100,
    justifyContent: 'center',
    overflow: 'hidden',
  },

  expandedIconWrapper: {
    position: 'absolute',
    left: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },

  textOverlay: {
    position: 'absolute',
    left: 50,
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    overflow: 'hidden',
  },

  valueText: {
    fontSize: 15,
  },

  valueTextSmall: {
    fontSize: 10,
  },

  labelText: {
    fontSize: 12,
    color: '#A8A8A8',
  },

  collapseMockIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  collapseMockIconLine: {
    width: 14,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});

export default React.memo(StakingDayBubble);
