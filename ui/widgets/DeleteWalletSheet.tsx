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
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import {
  useTheme,
  iconSizeMd,
  radiusPill,
  space4,
  space12,
  space16,
  space24,
} from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { TranslateType } from '@app/AppState';
import { DeleteWalletContext } from '@app/AppState/types/DeleteWalletContext';
import Text from '@ui/primitives/Text';
import AppSheetModal, { SheetFooter } from '@ui/primitives/AppSheetModal';
import Button, { BUTTON_HEIGHT } from '@ui/primitives/Button';
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

    const sub = translate(
      context === 'import'
        ? 'deletesheet.import-sub'
        : context === 'create'
          ? 'deletesheet.create-sub'
          : 'deletesheet.replace-sub',
    ) as string;

    return (
      <AppSheetModal ref={ref} onDismiss={reset}>
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 26,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radiusPill,
              backgroundColor: colors.bgDangerSubtle,
              borderWidth: 1,
              borderColor: colors.borderDanger,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TriangleAlert size={iconSizeMd} color={colors.fgDanger} />
          </View>
          <Text
            variant="bodyStrong"
            style={{ marginTop: space16, textAlign: 'center' }}
          >
            {
              translate(
                context === 'replace'
                  ? 'deletesheet.replace-title'
                  : 'deletesheet.title',
              ) as string
            }
          </Text>
          <Text
            variant="caption"
            tone="muted"
            style={{ marginTop: space4, textAlign: 'center' }}
          >
            {sub}
          </Text>
          <Animated.View style={[{ alignSelf: 'stretch' }, holdStyle]}>
            <Pressable
              testID="deletesheet.hold"
              onPressIn={start}
              onPressOut={release}
              accessibilityRole="button"
              style={{
                marginTop: space24,
                height: BUTTON_HEIGHT,
                borderRadius: radiusPill,
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
              <Text variant="button">
                {
                  translate(
                    context === 'replace'
                      ? 'deletesheet.hold-replace'
                      : 'deletesheet.hold',
                  ) as string
                }
              </Text>
            </Pressable>
          </Animated.View>
          <SheetFooter style={{ paddingHorizontal: 24 }}>
            <View style={{ marginTop: space12 }}>
              <Button
                testID="deletesheet.cancel"
                variant="quiet"
                inline
                title={translate('cancel') as string}
                onPress={dismiss}
              />
            </View>
          </SheetFooter>
        </View>
      </AppSheetModal>
    );
  },
);

export default DeleteWalletSheet;
