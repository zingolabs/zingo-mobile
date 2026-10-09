/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  Camera,
  Code,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { TranslateType } from '@app/AppState';
import { isViewingKey } from '@app/utils/seedPhrase';
import CircularReveal, { RevealOrigin } from '@ui/widgets/CircularReveal';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { FlashlightIcon } from '@ui/primitives/Icons/FlashlightIcon';

const FRAME = 240;
const BRACKET = 28;
const BRACKET_W = 3;
const OUTSIDE_DIM = 'rgba(0,0,0,0.6)';
const SWEEP_MS = 1800;
const FOUND_HOLD_MS = 750;
const MISS_HOLD_MS = 1600;

const pillPop = () =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.8 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: ease.spring },
  })
    .duration(260)
    .reduceMotion(ReduceMotion.System);

type ScanOverlayProps = {
  origin: RevealOrigin;
  translate: (key: string) => TranslateType;
  // A scanned viewing key, handed over once the camera has closed.
  onKey: (key: string) => void;
  onClosed: () => void;
};

type Stage = 'looking' | 'miss' | 'found';

// The camera, revealed from the scan button and collapsed back into it,
// that reads one viewing key QR code.
const ScanOverlay: React.FunctionComponent<ScanOverlayProps> = ({
  origin,
  translate,
  onKey,
  onClosed,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [open, setOpen] = useState(true);
  const [torch, setTorch] = useState(false);
  const [stage, setStage] = useState<Stage>('looking');
  const found = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const sweep = useSharedValue(0);
  const closing = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, {
        duration: SWEEP_MS,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
  }, [sweep]);
  const line = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.value * (FRAME - 4) }],
    opacity: 1 - closing.value,
  }));
  const frameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.2 * closing.value }],
  }));

  const read = useCallback(
    (value: string) => {
      if (stage === 'found') {
        return;
      }
      if (!isViewingKey(value)) {
        setStage('miss');
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setStage('looking'), MISS_HOLD_MS);
        return;
      }
      found.current = value;
      setStage('found');
      closing.value = withTiming(1, {
        duration: 280,
        easing: ease.spring,
        reduceMotion: ReduceMotion.System,
      });
      if (Platform.OS === 'android') {
        Vibration.vibrate(12);
      }
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setOpen(false), FOUND_HOLD_MS);
    },
    [stage, closing],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes: Code[]) => {
      const value = codes[0]?.value?.trim();
      if (value) {
        read(value);
      }
    },
  });

  const closed = useCallback(() => {
    if (found.current) {
      onKey(found.current);
    }
    onClosed();
  }, [onKey, onClosed]);

  const frameLeft = (size.width - FRAME) / 2;
  const frameTop = (size.height - FRAME) / 2;
  const bracketColor = stage === 'found' ? colors.fgAccent : '#FFFFFF';
  const corner = (v: 'top' | 'bottom', h: 'left' | 'right') => ({
    position: 'absolute' as const,
    [v]: 0,
    [h]: 0,
    width: BRACKET,
    height: BRACKET,
    borderColor: bracketColor,
    [`border${v === 'top' ? 'Top' : 'Bottom'}Width`]: BRACKET_W,
    [`border${h === 'left' ? 'Left' : 'Right'}Width`]: BRACKET_W,
    [`border${v === 'top' ? 'Top' : 'Bottom'}${h === 'left' ? 'Left' : 'Right'}Radius`]: 8,
  });

  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      onLayout={e =>
        setSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      <CircularReveal origin={origin} open={open} onClosed={closed}>
        <View
          testID="import.scanner"
          style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}
        >
          {hasPermission && device && (
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={open && stage !== 'found'}
              torch={torch ? 'on' : 'off'}
              codeScanner={codeScanner}
              androidPreviewViewType="texture-view"
            />
          )}
          <View
            pointerEvents="none"
            style={[
              styles.dim,
              { top: 0, height: frameTop, left: 0, right: 0 },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.dim,
              { top: frameTop + FRAME, bottom: 0, left: 0, right: 0 },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.dim,
              { top: frameTop, height: FRAME, left: 0, width: frameLeft },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.dim,
              { top: frameTop, height: FRAME, right: 0, width: frameLeft },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: frameLeft,
                top: frameTop,
                width: FRAME,
                height: FRAME,
              },
              frameStyle,
            ]}
          >
            <View style={corner('top', 'left')} />
            <View style={corner('top', 'right')} />
            <View style={corner('bottom', 'left')} />
            <View style={corner('bottom', 'right')} />
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: 12,
                  right: 12,
                  top: 0,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: colors.fgAccent,
                },
                line,
              ]}
            />
          </Animated.View>

          <View
            style={{
              position: 'absolute',
              top: insets.top + 6,
              left: 0,
              right: 0,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pressable
              testID="import.scanner.back"
              accessibilityRole="button"
              accessibilityLabel={translate('import.scan-back') as string}
              onPress={() => setOpen(false)}
              hitSlop={8}
              style={{ position: 'absolute', left: 10, padding: 10 }}
            >
              <ChevronLeft
                size={22}
                color={colors.fgAccent}
                strokeWidth={2.2}
              />
            </Pressable>
            <Text
              accessibilityRole="header"
              style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}
            >
              {translate('import.scan-title') as string}
            </Text>
          </View>

          <View
            style={{
              position: 'absolute',
              left: 40,
              right: 40,
              top: frameTop + FRAME + 28,
              alignItems: 'center',
            }}
          >
            {stage === 'found' ? (
              <Animated.View
                entering={pillPop()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 14,
                  backgroundColor: 'rgba(6,32,10,0.9)',
                }}
              >
                <CheckIcon size={14} color={colors.fgAccent} strokeWidth={3} />
                <Text
                  style={{
                    color: colors.fgAccent,
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {translate('import.scan-found') as string}
                </Text>
              </Animated.View>
            ) : (
              <Text
                accessibilityLiveRegion="polite"
                style={{
                  textAlign: 'center',
                  color: stage === 'miss' ? colors.fgWarning : '#E6ECF4',
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {
                  translate(
                    stage === 'miss' ? 'import.scan-miss' : 'import.scan-hint',
                  ) as string
                }
              </Text>
            )}
          </View>

          <Pressable
            testID="import.scanner.torch"
            accessibilityRole="button"
            accessibilityLabel={translate('import.scan-torch') as string}
            accessibilityState={{ selected: torch }}
            onPress={() => setTorch(t => !t)}
            style={{
              position: 'absolute',
              alignSelf: 'center',
              bottom: insets.bottom + 40,
              width: 52,
              height: 52,
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: torch ? '#FFFFFF' : 'rgba(255,255,255,0.16)',
            }}
          >
            <FlashlightIcon size={22} color={torch ? '#000000' : '#FFFFFF'} />
          </Pressable>
        </View>
      </CircularReveal>
    </View>
  );
};

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: OUTSIDE_DIM },
});

export default ScanOverlay;
