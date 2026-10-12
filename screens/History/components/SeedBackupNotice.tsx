/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { CardRect } from '@app/types';
import { SproutIcon } from '@ui/primitives/Icons/SproutIcon';

type SeedBackupNoticeProps = {
  // The flow is open over the card: its contents step aside for the container transform.
  covered: boolean;
  onBackUp: (from: CardRect) => void;
};

const COVER_MS = 120;
const UNCOVER_MS = 200;

// The seed phrase notice on History. Back up opens the flow from this card.
const SeedBackupNotice: React.FunctionComponent<SeedBackupNoticeProps> = ({
  covered,
  onBackUp,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const card = useRef<View>(null);

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
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: colors.bgWarning,
              }}
            >
              <Text style={{ color: colors.fgWarning, fontSize: 12 }}>
                {translate('seednotice.pending') as string}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.fgMuted, fontSize: 13, lineHeight: 18 }}>
            {translate('seednotice.body-pending') as string}
          </Text>
        </View>
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
            style={{ color: colors.bgCanvas, fontSize: 14, fontWeight: '700' }}
          >
            {translate('seednotice.button') as string}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default SeedBackupNotice;
