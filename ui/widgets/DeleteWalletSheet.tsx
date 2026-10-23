/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { radiusSheet, useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { TranslateType } from '@app/AppState';
import { DeleteWalletContext } from '@app/AppState/types/DeleteWalletContext';
import BoldText from '@ui/primitives/BoldText';
import RegText from '@ui/primitives/RegText';
import SheetRim from '@ui/primitives/SheetRim';
import { BUTTON_HEIGHT } from '@ui/primitives/Button';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';

type DeleteWalletSheetProps = {
  context: DeleteWalletContext;
  translate: (key: string) => TranslateType;
  onConfirmed: () => void;
  onReleasedEarly: () => void;
};

const DRAIN_MS = 250;
const PULSE_MS = 220;
const SETTLE_MS = 260;
const RELEASE_FLOOR = 0.02;

const SheetHandle: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingTop: 8,
        backgroundColor: colors.bgSurface,
        borderTopLeftRadius: radiusSheet,
        borderTopRightRadius: radiusSheet,
      }}
    >
      <SheetRim />
    </View>
  );
};

const DeleteWalletSheet = forwardRef<BottomSheetModal, DeleteWalletSheetProps>(
  ({ context, translate, onConfirmed, onReleasedEarly }, ref) => {
    const { colors } = useTheme();
    const progress = useSharedValue(0);
    const pulse = useSharedValue(1);
    const done = useRef(false);

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const complete = useCallback(() => {
      if (done.current) {
        return;
      }
      done.current = true;
      pulse.value = withSequence(
        withTiming(0.97, { duration: PULSE_MS / 2, easing: ease.spring }),
        withTiming(1, { duration: PULSE_MS / 2, easing: ease.spring }),
      );
      setTimeout(() => {
        dismiss();
        onConfirmed();
      }, SETTLE_MS);
    }, [dismiss, onConfirmed, pulse]);

    const start = useCallback(() => {
      if (done.current) {
        return;
      }
      cancelAnimation(progress);
      const remaining = duration.hold * (1 - progress.value);
      progress.value = withTiming(
        1,
        { duration: remaining, easing: Easing.linear },
        finished => {
          if (finished) {
            runOnJS(complete)();
          }
        },
      );
    }, [complete, progress]);

    const release = useCallback(() => {
      if (done.current) {
        return;
      }
      cancelAnimation(progress);
      if (progress.value < RELEASE_FLOOR) {
        progress.value = 0;
        return;
      }
      progress.value = withTiming(0, {
        duration: DRAIN_MS,
        easing: ease.standard,
      });
      onReleasedEarly();
    }, [onReleasedEarly, progress]);

    const reset = useCallback(() => {
      cancelAnimation(progress);
      progress.value = 0;
      pulse.value = 1;
      done.current = false;
    }, [progress, pulse]);

    const fillStyle = useAnimatedStyle(() => ({
      transform: [{ scaleX: progress.value }],
    }));
    const holdStyle = useAnimatedStyle(() => ({
      transform: [{ scale: pulse.value }],
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.62}
          pressBehavior="close"
        />
      ),
      [],
    );

    const sub = translate(
      context === 'import'
        ? 'deletesheet.import-sub'
        : context === 'create'
          ? 'deletesheet.create-sub'
          : 'deletesheet.replace-sub',
    ) as string;

    return (
      <BottomSheetModal
        ref={ref}
        accessible={false}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleComponent={SheetHandle}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
        }}
        onDismiss={reset}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bgSurface,
            paddingHorizontal: 24,
            paddingTop: 18,
            paddingBottom: 40,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.bgDangerSubtle,
              borderWidth: 1,
              borderColor: colors.borderDanger,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TriangleAlert size={20} color={colors.fgDanger} />
          </View>
          <BoldText
            style={{
              marginTop: 16,
              fontSize: 15,
              lineHeight: 20,
              textAlign: 'center',
            }}
          >
            {
              translate(
                context === 'replace'
                  ? 'deletesheet.replace-title'
                  : 'deletesheet.title',
              ) as string
            }
          </BoldText>
          <RegText
            style={{
              marginTop: 5,
              fontSize: 12,
              lineHeight: 16,
              textAlign: 'center',
              color: colors.fgMuted,
            }}
          >
            {sub}
          </RegText>
          <Animated.View style={[{ alignSelf: 'stretch' }, holdStyle]}>
            <Pressable
              testID="deletesheet.hold"
              onPressIn={start}
              onPressOut={release}
              accessibilityRole="button"
              style={{
                marginTop: 24,
                height: BUTTON_HEIGHT,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: colors.borderDanger,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: colors.bgDanger,
                    transformOrigin: 'left',
                  },
                  fillStyle,
                ]}
              />
              <RegText style={{ fontSize: 15, color: colors.fgDefault }}>
                {
                  translate(
                    context === 'replace'
                      ? 'deletesheet.hold-replace'
                      : 'deletesheet.hold',
                  ) as string
                }
              </RegText>
            </Pressable>
          </Animated.View>
          <Pressable
            testID="deletesheet.cancel"
            onPress={dismiss}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => ({
              marginTop: 14,
              height: 26,
              paddingHorizontal: 20,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <RegText
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: colors.fgMuted,
              }}
            >
              {translate('cancel') as string}
            </RegText>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

export default DeleteWalletSheet;
