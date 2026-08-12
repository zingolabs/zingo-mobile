/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import TransactionCreatedIcon from '../../../assets/img/transaction-created.svg';
import TransactionFailedIcon from '../../../assets/img/transaction-failed.svg';

// Ring colors come from the SVG stroke palette so the outer border
// matches the icon inside.
const RING_GREEN = '#149D05';
const RING_RED = '#822929';

import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';
import Button from '@ui/primitives/Button';
import SheetRim from '@ui/primitives/SheetRim';
import { AppDrawerParamList } from '../../types';
import { ContextAppLoaded } from '../../context';
import Header from '@ui/widgets/Header';
import { ButtonTypeEnum, RouteEnum, ScreenEnum } from '../../AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFullSheetSnapPoints } from '../../hooks/useFullSheetSnapPoints';

// Time spent on phase 1 ("Computing Transaction...") before swapping the
// copy to phase 2 ("Hang on tight..."). The actual `sendTransaction` runs
// in parallel — whichever finishes first (timer or send) decides what the
// user sees.
const PHASE1_DURATION_MS = 4000;

// "Typing" dot animation timing (Signal-style indicator). Each dot fades in
// and out over (DOT_PULSE_MS * 2) ms; consecutive dots are offset by
// DOT_OFFSET_MS so the wave travels left-to-right. After all three finish,
// there's a DOT_PAUSE_MS gap before the next round starts.
const DOT_PULSE_MS = 500;
const DOT_OFFSET_MS = 400;
const DOT_PAUSE_MS = 1100;
const DOT_COUNT = 3;
const DOT_OPACITY_MIN = 0.25;
const DOT_CYCLE_MS =
  (DOT_COUNT - 1) * DOT_OFFSET_MS + DOT_PULSE_MS * 2 + DOT_PAUSE_MS;

type TypingDotProps = {
  delay: number;
  color: string;
};

const TypingDot: React.FC<TypingDotProps> = ({ delay, color }) => {
  const opacity = useSharedValue(DOT_OPACITY_MIN);
  useEffect(() => {
    // Each dot runs the same total cycle so the three of them stay in
    // sync after every round: wait for its turn (delay), pulse in and
    // out, then hold at min until the cycle ends.
    const tailWait = DOT_CYCLE_MS - delay - DOT_PULSE_MS * 2;
    opacity.value = withRepeat(
      withSequence(
        withTiming(DOT_OPACITY_MIN, { duration: delay }),
        withTiming(1, {
          duration: DOT_PULSE_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(DOT_OPACITY_MIN, {
          duration: DOT_PULSE_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(DOT_OPACITY_MIN, { duration: tailWait }),
      ),
      -1,
    );
    return () => {
      opacity.value = DOT_OPACITY_MIN;
    };
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

type ComputingTxContentProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Computing
>;

const ComputingTxContent: React.FunctionComponent<ComputingTxContentProps> = ({
  route,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.ComputingTxContext;

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [timerPhase, setTimerPhase] = useState<0 | 1>(0);
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);
  const computingSheetRef = useRef<BottomSheet>(null);

  const computingSnapPoints = useFullSheetSnapPoints(containerH, headerH);
  const phase = route.params?.phase ?? 'computing';
  const errorMessage = route.params?.errorMessage;
  const isCreated = phase === 'created';
  const isFailed = phase === 'failed';
  const isTerminal = isCreated || isFailed;

  // Swap the copy after PHASE1_DURATION_MS — only while still in the
  // computing phase. If a terminal `phase` arrives before the timer
  // fires, we drop the timer altogether.
  useEffect(() => {
    if (isTerminal) {
      return;
    }
    const t = setTimeout(() => setTimerPhase(1), PHASE1_DURATION_MS);
    return () => clearTimeout(t);
  }, [isTerminal]);

  const onContinue = useCallback(() => {
    navigation.navigate(RouteEnum.HomeStack, {
      screen: RouteEnum.History,
    });
  }, [navigation]);

  const renderComputingHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        <SheetRim />
      </View>
    ),
    [colors],
  );

  // Footer is rendered in every phase (with the same reserved height) so
  // the BottomSheetView above always shrinks by the same amount, keeping
  // the centered content at the exact same vertical position regardless
  // of whether the button is visible.
  const renderComputingFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={{
            backgroundColor: colors.bgSurface,
            paddingTop: 10,
            paddingBottom: 24,
            minHeight: 82,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isTerminal && (
            <Button
              type={ButtonTypeEnum.Primary}
              title={translate('loadedapp.continue') as string}
              onPress={onContinue}
            />
          )}
        </View>
      </BottomSheetFooter>
    ),
    [colors, isTerminal, onContinue, translate],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
      }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={''}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
        />
      </View>
      <BottomSheet
        ref={computingSheetRef}
        snapPoints={computingSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderComputingHandle}
        footerComponent={renderComputingFooter}
      >
        <BottomSheetView
          style={{
            flex: 1,
            backgroundColor: colors.bgSurface,
            paddingHorizontal: 24,
            // Footer floats absolutely on top of the sheet (it doesn't
            // shrink the BottomSheetView), so we mirror its height on top
            // too — keeping the centered content in the true visual middle
            // of the area between handle and footer.
            paddingTop: 106,
            paddingBottom: 106,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Both terminal states render the icon inside a colored ring;
              the computing state uses the same 120x120 bounding box so
              `justifyContent: 'center'` lands every variant at the same Y. */}
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              borderWidth: isTerminal ? 3 : 0,
              borderColor: isCreated
                ? RING_GREEN
                : isFailed
                  ? RING_RED
                  : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCreated ? (
              <TransactionCreatedIcon width={30} height={30} />
            ) : isFailed ? (
              <TransactionFailedIcon width={30} height={30} />
            ) : (
              // size="large" renders at ~36px; scale ≈ 2.8 brings the
              // visible footprint up to ~100px to match the terminal ring.
              <ActivityIndicator
                size="large"
                color={colors.fgAccent}
                style={{ transform: [{ scale: 2.8 }] }}
              />
            )}
          </View>
          <BoldText
            style={{
              fontSize: 20,
              marginTop: 48,
              textAlign: 'center',
            }}
          >
            {
              translate(
                isCreated
                  ? 'loadedapp.transactioncreated-title'
                  : isFailed
                    ? 'loadedapp.transactionfailed-title'
                    : 'send.sending-title',
              ) as string
            }
          </BoldText>
          <RegText
            style={{
              marginTop: 12,
              textAlign: 'center',
              color: colors.fgMuted,
            }}
          >
            {
              translate(
                isCreated
                  ? 'loadedapp.transactioncreated-body'
                  : isFailed
                    ? 'loadedapp.transactionfailed-body'
                    : timerPhase === 0
                      ? 'loadedapp.computingtx'
                      : 'loadedapp.computingtx-hangon',
              ) as string
            }
          </RegText>
          {!isTerminal && (
            <View
              style={{
                flexDirection: 'row',
                marginTop: 24,
                gap: 12,
              }}
            >
              <TypingDot delay={0} color={colors.bgMuted} />
              <TypingDot delay={DOT_OFFSET_MS} color={colors.bgMuted} />
              <TypingDot delay={DOT_OFFSET_MS * 2} color={colors.bgMuted} />
            </View>
          )}
          {isFailed && !!errorMessage && (
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setShowErrorDetails(v => !v)}
                hitSlop={8}
              >
                <RegText
                  style={{
                    color: RING_RED,
                    textDecorationLine: 'underline',
                  }}
                >
                  {translate('loadedapp.transactionfailed-details') as string}
                </RegText>
              </TouchableOpacity>
              {showErrorDetails && (
                <RegText
                  style={{
                    marginTop: 10,
                    textAlign: 'center',
                    color: colors.fgMuted,
                    fontSize: 12,
                  }}
                >
                  {errorMessage}
                </RegText>
              )}
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

export default ComputingTxContent;
