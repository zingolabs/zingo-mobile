/* eslint-disable react-native/no-inline-styles */
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import BoldText from '@ui/primitives/BoldText';
import RegText from '@ui/primitives/RegText';

export const ROW_DIVIDER = '#0A1F3D';
const RADIO_OFF = '#3A5070';
const FAST_MS = 150;

type RadioProps = { selected: boolean };

const Radio: React.FC<RadioProps> = ({ selected }) => {
  const { colors } = useTheme();
  const dot = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    dot.value = withTiming(selected ? 1 : 0, {
      duration: 200,
      easing: selected ? ease.spring : ease.standard,
    });
  }, [selected, dot]);
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dot.value }],
  }));
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? colors.fgAccent : RADIO_OFF,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: 9,
            height: 9,
            borderRadius: 4.5,
            backgroundColor: colors.fgAccent,
          },
          dotStyle,
        ]}
      />
    </View>
  );
};

type LatencyProps = {
  // undefined while unknown, null when the server did not answer.
  ms: number | null | undefined;
  notResponding: string;
};

export const Latency: React.FC<LatencyProps> = ({ ms, notResponding }) => {
  const { colors } = useTheme();
  if (ms === undefined) {
    return null;
  }
  const bad = ms === null;
  const dot = bad
    ? colors.fgDangerEmphasis
    : ms < FAST_MS
      ? colors.fgAccent
      : colors.fgMuted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }}
      />
      <RegText
        style={{
          fontSize: 11.5,
          color: bad ? colors.fgDanger : colors.fgMuted,
        }}
      >
        {bad ? notResponding : `${ms} ms`}
      </RegText>
    </View>
  );
};

type ServerRowProps = {
  title: string;
  sub?: string;
  selected: boolean;
  disabled?: boolean;
  first?: boolean;
  chevron?: boolean;
  right?: React.ReactNode;
  // Changes to shake the row once, for a pick that cannot be honoured.
  shake?: number;
  onPress: () => void;
  testID: string;
};

const ServerRow: React.FC<ServerRowProps> = ({
  title,
  sub,
  selected,
  disabled = false,
  first = false,
  chevron = false,
  right,
  shake = 0,
  onPress,
  testID,
}) => {
  const { colors } = useTheme();
  const x = useSharedValue(0);
  useEffect(() => {
    if (shake === 0) {
      return;
    }
    const step = { duration: 60, easing: ease.standard };
    x.value = withSequence(
      withTiming(-5, step),
      withTiming(5, step),
      withTiming(-3, step),
      withTiming(0, step),
    );
  }, [shake, x]);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <Animated.View style={shakeStyle}>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled }}
        style={({ pressed }) => ({
          minHeight: 55,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 13,
          paddingVertical: 10,
          paddingLeft: 14.5,
          paddingRight: 16,
          borderTopWidth: first ? 0 : 1,
          borderTopColor: ROW_DIVIDER,
          backgroundColor: pressed ? 'rgba(255,255,255,0.02)' : 'transparent',
        })}
      >
        <Radio selected={selected} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <RegText
            numberOfLines={1}
            style={{ fontSize: 13.5, lineHeight: 19, fontWeight: '500' }}
          >
            {title}
          </RegText>
          {!!sub && (
            <RegText
              style={{ fontSize: 11, lineHeight: 16, color: colors.fgMuted }}
            >
              {sub}
            </RegText>
          )}
        </View>
        {right}
        {chevron && (
          <FontAwesomeIcon
            icon={faChevronRight}
            size={12}
            color={colors.fgMuted}
          />
        )}
      </Pressable>
    </Animated.View>
  );
};

export const RowCard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: 21.5,
        borderRadius: 14,
        backgroundColor: colors.bgSurface,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
};

export const ScreenHeader: React.FC<{
  title: string;
  onBack: () => void;
  disabled: boolean;
  testID: string;
}> = ({ title, onBack, disabled, testID }) => {
  const { colors } = useTheme();
  return (
    <>
      <Pressable
        testID={testID}
        onPress={onBack}
        disabled={disabled}
        hitSlop={8}
        accessibilityRole="button"
        style={({ pressed }) => ({
          position: 'absolute',
          left: 17,
          top: 38,
          width: 44,
          height: 44,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
          backgroundColor: pressed ? colors.bgSurface : 'transparent',
        })}
      >
        <FontAwesomeIcon
          icon={faChevronLeft}
          size={18}
          color={colors.fgAccent}
        />
      </Pressable>
      <BoldText
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          top: 50,
          fontSize: 16,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        {title}
      </BoldText>
    </>
  );
};

export const DoneButton: React.FC<{
  title: string;
  onPress: () => void;
  disabled: boolean;
  testID: string;
}> = ({ title, onPress, disabled, testID }) => {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        position: 'absolute',
        bottom: 44,
        alignSelf: 'center',
        width: 270,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.bgAccent,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <RegText style={{ fontSize: 16, color: colors.bgCanvas }}>
        {title}
      </RegText>
    </Pressable>
  );
};

export default ServerRow;
