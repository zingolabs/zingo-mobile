/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { radiusPill, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';

/** The notice stack's banner height, from the Full Flow prototype. */
export const NOTICE_CARD_H = 76.5;

type NoticeCardProps = {
  testID?: string;
  icon: React.ReactNode;
  title: string;
  /** The small tag beside the title: amber when it asks for something, green once done. */
  pill: { text: string; tone: 'warning' | 'positive' };
  body: string;
  action: { title: string; onPress: () => void; testID?: string };
  /** Fades the contents while a flow grows out of the card. */
  contentStyle?: React.ComponentProps<typeof Animated.View>['style'];
};

/**
 * A banner of the notice stack, at the prototype's size: the icon, the title
 * and its pill on top, one line of explanation under them, and a small green
 * button on the right. When the pill turns green it pops, as a spring.
 */
const NoticeCard = forwardRef<View, NoticeCardProps>(
  ({ testID, icon, title, pill, body, action, contentStyle }, ref) => {
    const { colors } = useTheme();
    const pop = useSharedValue(1);
    useEffect(() => {
      if (pill.tone === 'positive') {
        pop.value = withSequence(
          withTiming(1.12, {
            duration: 120,
            reduceMotion: ReduceMotion.System,
          }),
          withSpring(1, {
            duration: 240,
            reduceMotion: ReduceMotion.System,
          }),
        );
      }
    }, [pill.tone, pop]);
    const pillStyle = useAnimatedStyle(() => ({
      transform: [{ scale: pop.value }],
    }));
    const ink = pill.tone === 'positive' ? colors.fgPriceUp : colors.fgWarning;
    const tint =
      pill.tone === 'positive' ? colors.bgAccentSubtle : colors.bgWarningSubtle;

    return (
      <View
        ref={ref}
        testID={testID}
        style={{
          height: NOTICE_CARD_H,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          backgroundColor: colors.bgSurface,
        }}
      >
        <Animated.View style={[{ flex: 1 }, contentStyle]}>
          <View
            style={{
              position: 'absolute',
              left: 14.5,
              top: 13,
              flexDirection: 'row',
              alignItems: 'center',
              columnGap: 8,
            }}
          >
            {icon}
            <Text
              style={{ fontSize: 11, lineHeight: 13, color: colors.fgDefault }}
            >
              {title}
            </Text>
            <Animated.View
              style={[
                {
                  height: 18,
                  paddingHorizontal: 6,
                  borderRadius: 5,
                  backgroundColor: tint,
                  justifyContent: 'center',
                  marginLeft: 1,
                },
                pillStyle,
              ]}
            >
              <Text style={{ fontSize: 11, lineHeight: 13, color: ink }}>
                {pill.text}
              </Text>
            </Animated.View>
          </View>
          <Text
            numberOfLines={2}
            style={{
              position: 'absolute',
              left: 15,
              right: 102,
              top: 38,
              fontSize: 10.5,
              lineHeight: 14,
              color: colors.fgMuted,
            }}
          >
            {body}
          </Text>
          <Pressable
            testID={action.testID}
            accessibilityRole="button"
            onPress={action.onPress}
            style={({ pressed }) => ({
              position: 'absolute',
              right: 16,
              top: 28,
              width: 70,
              height: 22.5,
              borderRadius: radiusPill,
              backgroundColor: colors.bgAccent,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                color: colors.fgOnAccent,
              }}
            >
              {action.title}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  },
);

export default NoticeCard;
