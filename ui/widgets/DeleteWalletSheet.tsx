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
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { radiusSheet, useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { TranslateType } from '@app/AppState';
import { DeleteWalletContext } from '@app/AppState/types/DeleteWalletContext';
import BoldText from '@ui/primitives/BoldText';
import RegText from '@ui/primitives/RegText';
import SheetRim from '@ui/primitives/SheetRim';

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
const ICON_BG = '#2A1218';
const ICON_BORDER = '#6B2A33';
const ICON_FG = '#F07A86';
const HOLD_LABEL = '#FFE9EA';

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
        backgroundStyle={{ backgroundColor: colors.bgSurface }}
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
              backgroundColor: ICON_BG,
              borderWidth: 1,
              borderColor: ICON_BORDER,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              size={20}
              color={ICON_FG}
            />
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
              fontSize: 10.5,
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
                height: 45,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: colors.fgDangerEmphasis,
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
                    backgroundColor: colors.fgDangerEmphasis,
                    transformOrigin: 'left',
                  },
                  fillStyle,
                ]}
              />
              <RegText style={{ fontSize: 15, color: HOLD_LABEL }}>
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
            <RegText style={{ fontSize: 12.5, color: colors.fgMuted }}>
              {translate('cancel') as string}
            </RegText>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

export default DeleteWalletSheet;
