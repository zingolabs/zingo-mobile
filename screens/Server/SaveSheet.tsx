/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Keyframe,
  ReduceMotion,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';

type SaveSheetProps = {
  title: string;
  body: string;
  saveLabel: string;
  discardLabel: string;
  keepLabel: string;
  onSave: () => void;
  onDiscard: () => void;
  onKeep: () => void;
};

// Asks before leaving the Server screen with a custom address not saved.
const SaveSheet: React.FC<SaveSheetProps> = ({
  title,
  body,
  saveLabel,
  discardLabel,
  keepLabel,
  onSave,
  onDiscard,
  onKeep,
}) => {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const sheetIn = new Keyframe({
    0: { transform: [{ translateY: height }] },
    100: { transform: [{ translateY: 0 }], easing: ease.emphasized },
  })
    .duration(420)
    .delay(40)
    .reduceMotion(ReduceMotion.System);
  const sheetOut = new Keyframe({
    0: { transform: [{ translateY: 0 }] },
    100: { transform: [{ translateY: height }], easing: ease.in },
  })
    .duration(260)
    .reduceMotion(ReduceMotion.System);
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 10,
      }}
      accessibilityViewIsModal
    >
      <Animated.View
        entering={FadeIn.duration(240).reduceMotion(ReduceMotion.System)}
        exiting={FadeOut.duration(260)
          .delay(40)
          .reduceMotion(ReduceMotion.System)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'rgba(2,6,12,0.62)',
        }}
      >
        <Pressable
          testID="server.unsaved.dim"
          style={{ flex: 1 }}
          onPress={onKeep}
          accessibilityLabel={keepLabel}
        />
      </Animated.View>
      <Animated.View
        testID="server.unsaved"
        entering={sheetIn}
        exiting={sheetOut}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: 36,
          paddingHorizontal: 24,
          paddingBottom: 30,
          backgroundColor: colors.bgSurface,
          borderTopWidth: 1,
          borderTopColor: colors.bottomSheetBorder,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 10,
            alignSelf: 'center',
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.bottomSheetBorder,
          }}
        />
        <BoldText style={{ fontSize: 15, textAlign: 'center' }}>
          {title}
        </BoldText>
        <RegText
          style={{
            marginTop: 8,
            marginBottom: 20,
            fontSize: 11.5,
            lineHeight: 17,
            textAlign: 'center',
            color: colors.fgMuted,
          }}
        >
          {body}
        </RegText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            testID="server.unsaved.discard"
            onPress={onDiscard}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flex: 1,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? 'rgba(20,157,5,0.12)' : 'transparent',
            })}
          >
            <BoldText style={{ fontSize: 15, color: colors.fgAccent }}>
              {discardLabel}
            </BoldText>
          </Pressable>
          <Pressable
            testID="server.unsaved.save"
            onPress={onSave}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flex: 1,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bgAccent,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <RegText style={{ fontSize: 15, color: colors.bgCanvas }}>
              {saveLabel}
            </RegText>
          </Pressable>
        </View>
        <Pressable
          testID="server.unsaved.keep"
          onPress={onKeep}
          accessibilityRole="button"
          style={{
            alignSelf: 'center',
            marginTop: 12,
            height: 30,
            paddingHorizontal: 12,
            justifyContent: 'center',
          }}
        >
          <RegText style={{ fontSize: 12.5, color: colors.fgMuted }}>
            {keepLabel}
          </RegText>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default SaveSheet;
