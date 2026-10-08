/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { CardRect } from '@app/types';
import { SproutIcon } from '@ui/primitives/Icons/SproutIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';

type SeedBackupNoticeProps = {
  backedUp: boolean;
  // The flow is open over the card: its contents step aside for the container transform.
  covered: boolean;
  onBackUp: (from: CardRect) => void;
};

const PILL_MS = 240;
const BUTTON_FADE_MS = 200;
const COVER_MS = 120;
const UNCOVER_MS = 200;

const pillIn = () =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.9 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: ease.spring },
  })
    .duration(PILL_MS)
    .reduceMotion(ReduceMotion.System);

// The seed phrase notice on History. Back up opens the flow from this card.
const SeedBackupNotice: React.FunctionComponent<SeedBackupNoticeProps> = ({
  backedUp,
  covered,
  onBackUp,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const card = useRef<View>(null);

  const button = useAnimatedStyle(() => ({
    opacity: withTiming(backedUp ? 0 : 1, {
      duration: BUTTON_FADE_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.Never,
    }),
    transform: [
      {
        scale: withTiming(backedUp ? 0.9 : 1, {
          duration: BUTTON_FADE_MS,
          easing: ease.standard,
          reduceMotion: ReduceMotion.System,
        }),
      },
    ],
  }));

  const contents = useAnimatedStyle(() => ({
    opacity: withTiming(covered ? 0 : 1, {
      duration: covered ? COVER_MS : UNCOVER_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.Never,
    }),
  }));

  const open = () =>
    card.current?.measureInWindow((x, y, width, height) =>
      onBackUp({ x, y, width, height }),
    );

  const tint = backedUp ? colors.fgAccent : colors.fgWarning;

  return (
    <View
      ref={card}
      testID="seedbackup.notice"
      style={{
        backgroundColor: colors.bgSurface,
        borderColor: colors.bottomSheetBorder,
        borderWidth: 1,
        borderRadius: 14,
        paddingLeft: 16,
        paddingRight: 14,
        paddingVertical: 13,
      }}
    >
      <Animated.View
        style={[
          { flexDirection: 'row', alignItems: 'center', gap: 12 },
          contents,
        ]}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <SproutIcon size={16} color={colors.fgAccent} />
            <Text style={{ color: colors.fgDefault, fontSize: 14 }}>
              {translate('seednotice.title') as string}
            </Text>
            <Animated.View
              key={backedUp ? 'done' : 'pending'}
              entering={backedUp ? pillIn() : undefined}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: backedUp
                  ? `${colors.fgAccent}24`
                  : colors.bgWarning,
              }}
            >
              {backedUp && <CheckIcon size={11} color={tint} strokeWidth={3} />}
              <Text style={{ color: tint, fontSize: 12 }}>
                {
                  translate(
                    backedUp ? 'seednotice.done' : 'seednotice.pending',
                  ) as string
                }
              </Text>
            </Animated.View>
          </View>
          <Text style={{ color: colors.fgMuted, fontSize: 13, lineHeight: 18 }}>
            {
              translate(
                backedUp ? 'seednotice.body-done' : 'seednotice.body-pending',
              ) as string
            }
          </Text>
        </View>
        <Animated.View
          style={button}
          pointerEvents={backedUp ? 'none' : 'auto'}
        >
          <Pressable
            testID="seedbackup.start"
            accessibilityRole="button"
            onPress={open}
            style={({ pressed }) => ({
              backgroundColor: colors.bgAccent,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 7,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Text
              style={{
                color: colors.bgCanvas,
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              {translate('seednotice.button') as string}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default SeedBackupNotice;
