/* eslint-disable react-native/no-inline-styles */
import React, { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import FadeText from '@ui/primitives/FadeText';
import RegText from '@ui/primitives/RegText';

type InfoTooltipProps = {
  label: string;
  text: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  testID?: string;
};

const ARROW = 10;
const GAP = 8;

const bubbleEnter = () =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: 4 }] },
    100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  })
    .duration(180)
    .reduceMotion(ReduceMotion.System);
const bubbleExit = () =>
  new Keyframe({
    0: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
    100: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: 4 }] },
  })
    .duration(120)
    .reduceMotion(ReduceMotion.System);

const InfoTooltip: React.FunctionComponent<InfoTooltipProps> = ({
  label,
  text,
  open,
  onToggle,
  testID,
}) => {
  const { colors } = useTheme();
  const containerRef = useRef<View>(null);
  const iconRef = useRef<View>(null);
  const [containerW, setContainerW] = useState(0);
  const [bubbleW, setBubbleW] = useState(0);
  const [iconCenter, setIconCenter] = useState(0);
  const spin = useSharedValue(0);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const toggle = () => {
    if (!open) {
      spin.value = 0;
      spin.value = withTiming(360, {
        duration: duration.emphasized,
        easing: ease.out,
      });
      iconRef.current?.measureLayout(
        containerRef.current as unknown as number,
        (x, _y, w) => setIconCenter(x + w / 2),
      );
    }
    onToggle(!open);
  };

  const left = Math.min(
    Math.max(iconCenter - bubbleW / 2, 0),
    Math.max(containerW - bubbleW, 0),
  );

  return (
    <View
      ref={containerRef}
      onLayout={e => setContainerW(e.nativeEvent.layout.width)}
      style={{ alignSelf: 'stretch', alignItems: 'center' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <FadeText>{label}</FadeText>
        <Pressable
          ref={iconRef}
          testID={testID}
          onPress={toggle}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded: open }}
        >
          <Animated.View style={spinStyle}>
            <FontAwesomeIcon
              icon={faCircleInfo}
              size={16}
              color={colors.fgMuted}
            />
          </Animated.View>
        </Pressable>
      </View>
      {open && (
        <Animated.View
          entering={bubbleEnter()}
          exiting={bubbleExit()}
          onLayout={e => setBubbleW(e.nativeEvent.layout.width)}
          style={{
            position: 'absolute',
            bottom: '100%',
            left,
            marginBottom: GAP,
            maxWidth: 300,
            opacity: bubbleW ? 1 : 0,
          }}
        >
          <View
            style={{
              backgroundColor: colors.bgChrome,
              borderColor: colors.bottomSheetBorder,
              borderWidth: 1,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <RegText style={{ fontSize: 13 }}>{text}</RegText>
          </View>
          <View
            style={{
              position: 'absolute',
              bottom: -ARROW / 2,
              left: iconCenter - left - ARROW / 2,
              width: ARROW,
              height: ARROW,
              backgroundColor: colors.bgChrome,
              borderColor: colors.bottomSheetBorder,
              borderRightWidth: 1,
              borderBottomWidth: 1,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </Animated.View>
      )}
    </View>
  );
};

export default InfoTooltip;
