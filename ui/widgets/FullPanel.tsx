/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
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
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { space20, useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { contentTopPad } from '@app/navigation/safeArea';
import TitleBar from '@ui/widgets/TitleBar';
import { HEADER_BAR_HEIGHT } from '@ui/widgets/Header/Header';
import AppSheet from '@ui/primitives/AppSheet';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { XIcon } from '@ui/primitives/Icons/XIcon';

/** The panel stops this far under the top bar, as the sheets do. */
const SNAP_GAP = 4;
const MIN_PANEL = 200;
/** The panel rising, and lowering when it leaves. */
const PANEL_IN = { duration: duration.panelIn, easing: ease.panel };
const PANEL_OUT = { duration: duration.panelOut, easing: ease.panel };
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
  testID?: string;
  children: React.ReactNode;
};

/**
 * The full panel the redesign opens anything in depth with (a transaction,
 * a review, the swap flow). Its route has a transparent background, so the
 * screen it was opened from stays behind it; only the panel moves: it rises
 * to its final height (known from the first frame, so it never jumps),
 * its content fades in, and going back lowers it. Only the top bar of the
 * screen behind stays above it; the green back arrow and the title head it,
 * the content scrolls and the footer stays put.
 */
export default function FullPanel({
  title,
  onBack,
  onClose,
  footer,
  center,
  motion = 'rise',
  testID,
  children,
}: FullPanelProps) {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const navigation = useNavigation();
  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const rises = motion === 'rise';

  /** The screen under the app's top pad, less the top bar that stays above. */
  const snapPoints = useMemo(
    () => [
      Math.max(
        frame.height - contentTopPad(insets.top) - HEADER_BAR_HEIGHT - SNAP_GAP,
        MIN_PANEL,
      ),
    ],
    [frame.height, insets.top],
  );

  const fade = useSharedValue(0);
  useEffect(() => {
    fade.value = withDelay(
      rises ? CONTENT_DELAY : 0,
      withTiming(1, {
        duration: rises ? duration.axis : duration.step,
        easing: ease.standard,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [fade, rises]);
  const contentStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  /**
   * Leaving lowers the panel first, then lets the route go. A replace (the
   * next step of a flow) goes at once: the next panel takes its place.
   */
  const closing = useRef(false);
  useEffect(() => {
    if (!rises || !navigation?.addListener) {
      return;
    }
    return navigation.addListener('beforeRemove', e => {
      if (closing.current || e.data.action.type === 'REPLACE') {
        return;
      }
      e.preventDefault();
      closing.current = true;
      sheetRef.current?.close(PANEL_OUT);
      setTimeout(() => navigation.dispatch(e.data.action), PANEL_OUT.duration);
    });
  }, [navigation, rises]);

  const sheetHeader = (
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
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer ? (
        <BottomSheetFooter {...props} bottomInset={0}>
          <View
            style={{
              paddingHorizontal: space20,
              paddingTop: 12,
              paddingBottom: 32,
              backgroundColor: colors.bgSurface,
            }}
          >
            {footer}
          </View>
        </BottomSheetFooter>
      ) : (
        <></>
      ),
    [footer, colors],
  );

  return (
    <View style={{ flex: 1 }}>
      <AppSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        header={sheetHeader}
        renderFooter={footer ? renderFooter : undefined}
        animationConfigs={PANEL_IN}
        animateOnMount={rises}
      >
        <BottomSheetScrollView
          testID={testID}
          bounces={false}
          alwaysBounceVertical={false}
          style={{ flex: 1 }}
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
        </BottomSheetScrollView>
      </AppSheet>
    </View>
  );
}
