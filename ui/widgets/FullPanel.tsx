/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { radiusSheet, space20, useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { contentTopPad } from '@app/navigation/safeArea';
import TitleBar from '@ui/widgets/TitleBar';
import TooltipHost from '@ui/widgets/TooltipHost';
import { PANEL_TOP } from '@ui/widgets/Header/Header';
import SheetRim from '@ui/primitives/SheetRim';
import { SurfaceContext } from '@ui/primitives/Surface';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { XIcon } from '@ui/primitives/Icons/XIcon';

const MIN_PANEL = 200;
/** The panel rising, and lowering when it leaves. */
const PANEL_IN = {
  duration: duration.panelIn,
  easing: ease.panel,
  reduceMotion: ReduceMotion.System,
};
const PANEL_OUT = {
  duration: duration.panelOut,
  easing: ease.panel,
  reduceMotion: ReduceMotion.System,
};
/** The content fades in as the panel nears its place. */
const CONTENT_DELAY = 160;

type FullPanelProps = {
  title: string;
  /** A step back; absent once there is nothing to go back to. */
  onBack?: () => void;
  /** Leaves the flow; absent while leaving would strand a deposit. */
  onClose?: () => void;
  /** Rendered under the content, above the tab bar. */
  footer?: React.ReactNode;
  /** Centres the content vertically, for a result that stands alone. */
  center?: boolean;
  /**
   * 'rise' (default): the panel rises over the screen it was opened from
   * and lowers when it leaves. 'step': a step inside a panel (sending,
   * sent) that is already up, so it is in place at once and only its
   * content fades in.
   */
  motion?: 'rise' | 'step';
  /**
   * Sizes the panel to its content, up to the full height, and scrolls past
   * that. It waits out of sight until the content is measured, then rises.
   */
  fit?: boolean;
  testID?: string;
  children: React.ReactNode;
};

/**
 * The full panel the redesign opens anything in depth with (a transaction,
 * a review, the swap flow): a plain screen drawn as a panel, not a sheet,
 * so nothing drags or snaps. Its route has a transparent background, so the
 * screen it was opened from stays behind it; only the panel moves: it rises
 * to its height, its content fades in, and going back lowers it. Only the
 * top bar of the screen behind stays above it; the title bar heads it, the
 * content scrolls and the footer stays put.
 */
export default function FullPanel({
  title,
  onBack,
  onClose,
  footer,
  center,
  motion = 'rise',
  fit = false,
  testID,
  children,
}: FullPanelProps) {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const navigation = useNavigation();
  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const rises = motion === 'rise';

  /** The screen under the app's top pad, less the top bar that stays above. */
  const full = Math.max(
    frame.height - contentTopPad(insets.top) - PANEL_TOP,
    MIN_PANEL,
  );
  const [headerH, setHeaderH] = useState<number>(0);
  const [contentH, setContentH] = useState<number>(0);
  const fitted = fit && headerH > 0 && contentH > 0;
  const height = fitted
    ? Math.min(full, Math.max(headerH, radiusSheet) + contentH)
    : full;
  /** Fitting, nothing shows until the height is known. */
  const ready = !fit || fitted;

  /** How far the panel sits below its place: out of sight while it waits. */
  const drop = useSharedValue(rises || fit ? frame.height + full : 0);
  const shown = useRef(false);
  useEffect(() => {
    if (!ready || shown.current) {
      return;
    }
    shown.current = true;
    if (rises) {
      drop.value = height;
      drop.value = withTiming(0, PANEL_IN);
    } else {
      drop.value = 0;
    }
  }, [ready, rises, height, drop]);
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }],
  }));

  const fade = useSharedValue(0);
  useEffect(() => {
    if (!ready) {
      return;
    }
    fade.value = withDelay(
      rises ? CONTENT_DELAY : 0,
      withTiming(1, {
        duration: rises ? duration.axis : duration.step,
        easing: ease.standard,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [fade, rises, ready]);
  const contentStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  /**
   * Leaving lowers the panel first, then lets the route go. A replace (the
   * next step of a flow) goes at once: the next panel takes its place.
   */
  const closing = useRef(false);
  const heightRef = useRef(height);
  heightRef.current = height;
  useEffect(() => {
    if (!rises || !navigation?.addListener) {
      return;
    }
    return navigation.addListener('beforeRemove', e => {
      // Only the panel on top lowers; the ones under it leave with it.
      if (
        closing.current ||
        e.data.action.type === 'REPLACE' ||
        !navigation.isFocused()
      ) {
        return;
      }
      e.preventDefault();
      closing.current = true;
      drop.value = withTiming(heightRef.current, PANEL_OUT);
      setTimeout(() => navigation.dispatch(e.data.action), PANEL_OUT.duration);
    });
  }, [navigation, rises, drop]);

  return (
    <View style={{ flex: 1 }} pointerEvents="box-none">
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height,
            backgroundColor: colors.bgSurface,
            borderTopLeftRadius: radiusSheet,
            borderTopRightRadius: radiusSheet,
            overflow: 'hidden',
          },
          panelStyle,
        ]}
      >
        <View
          style={{ minHeight: radiusSheet }}
          onLayout={
            fit ? e => setHeaderH(e.nativeEvent.layout.height) : undefined
          }
        >
          <SheetRim />
          <TitleBar
            title={title}
            left={
              onBack
                ? {
                    icon: ChevronLeft,
                    accent: true,
                    testID: `${testID ?? 'swap.flow'}.back`,
                    accessibilityLabel: translate('swap.back') as string,
                    onPress: onBack,
                  }
                : undefined
            }
            right={
              onClose
                ? {
                    icon: XIcon,
                    testID: `${testID ?? 'swap.flow'}.close`,
                    accessibilityLabel: translate('swap.close') as string,
                    onPress: onClose,
                  }
                : undefined
            }
          />
        </View>
        <SurfaceContext.Provider value="surface">
          <TooltipHost>
            <KeyboardAwareScrollView
              testID={testID}
              bottomOffset={16}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              alwaysBounceVertical={false}
              style={{ flex: 1 }}
              onContentSizeChange={
                fit ? (_: number, h: number) => setContentH(h) : undefined
              }
              contentContainerStyle={{
                flexGrow: center ? 1 : undefined,
                justifyContent: center ? 'center' : 'flex-start',
                paddingHorizontal: space20,
                paddingTop: 8,
                paddingBottom: footer ? 140 : 60,
              }}
            >
              <Animated.View
                style={[
                  contentStyle,
                  center ? { flexGrow: 1, justifyContent: 'center' } : null,
                ]}
              >
                {children}
              </Animated.View>
            </KeyboardAwareScrollView>
          </TooltipHost>
        </SurfaceContext.Provider>
        {!!footer && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: space20,
              paddingTop: 12,
              paddingBottom: 32,
              backgroundColor: colors.bgSurface,
            }}
          >
            {footer}
          </View>
        )}
      </Animated.View>
    </View>
  );
}
