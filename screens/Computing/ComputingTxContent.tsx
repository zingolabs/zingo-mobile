/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Animated, {
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { space20, useTheme, radiusPill } from '@app/theme';
import { sendArt } from '@app/theme/sendArt';
import { duration, ease } from '@app/theme/motion';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import FullPanel from '@ui/widgets/FullPanel';
import SendFlight, { FAILED_AT } from '@ui/widgets/Flight/SendFlight';
import { AppDrawerParamList, WalletNavigation } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { GlobalConst, Route, ValueTransferType } from '@app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  STEPS,
  SendStep,
  SendView,
  failedSince,
  failureOf,
  followTxids,
} from './sendProgress';
import ErrorDetails from './ErrorDetails';
import TransactionsSheet from './TransactionsSheet';

/**
 * How long Creating is told before Through NYM. The backend creates and
 * sends in one call, so this switch is the only step a clock decides.
 */
const BUILD_MS = 2 * duration.hero;
/** The fade between one step's words and the next. */
const STEP_FADE_MS = duration.step;
/** Error details arrive once the drawing has started to fail. */
const ERROR_AFTER_MS = 700;

type ComputingTxContentProps = NativeStackScreenProps<
  AppDrawerParamList,
  'Computing'
>;

/** Words that fade out and back in when they change. */
const useFadedText = (text: string) => {
  const [shown, setShown] = useState<string>(text);
  const fade = useSharedValue(1);
  useEffect(() => {
    if (text === shown) {
      return;
    }
    const motion = {
      duration: STEP_FADE_MS,
      reduceMotion: ReduceMotion.System,
    };
    fade.value = withSequence(withTiming(0, motion), withTiming(1, motion));
    const swap = setTimeout(() => setShown(text), STEP_FADE_MS);
    return () => clearTimeout(swap);
  }, [text, shown, fade]);
  const style = useAnimatedStyle(() => ({ opacity: fade.value }));
  return [shown, style] as const;
};

/** One of the step dots: 0 unlit, 1 lit once the send has reached its step, 2 red where it failed. */
const StepDot = ({ state }: { state: number }) => {
  const { colors } = useTheme();
  const on = useSharedValue(state);
  useEffect(() => {
    on.value = withTiming(state, {
      duration: duration.axis,
      reduceMotion: ReduceMotion.System,
    });
  }, [state, on]);
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      on.value,
      [0, 1, 2],
      [sendArt.nodeStroke, colors.fgAccent, colors.fgDanger],
    ),
  }));
  return (
    <Animated.View
      style={[{ width: 6, height: 6, borderRadius: radiusPill }, style]}
    />
  );
};

/** What arrives under a step that has started: it rises in once. */
const RiseIn = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => {
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withDelay(
      delay,
      withTiming(1, {
        duration: duration.axis,
        easing: ease.emphasized,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [shown, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: 6 * (1 - shown.value) }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
};

/**
 * A send or a shield, followed from the moment it leaves to its last
 * confirmation: Creating, Through NYM, In the mempool, Confirming 1 to 3 of
 * 3, then Sent. While the backend works, a clock moves
 * Creating to Through NYM; once it answers with the txids, the
 * transactions' own state tells the rest, so leaving and coming back from
 * History finds it at the right step. A send that fails says where, and the
 * drawing ends there; one that failed to send and turns up after all goes on.
 */
const ComputingTxContent: React.FunctionComponent<ComputingTxContentProps> = ({
  route,
}) => {
  const navigation = useNavigation<WalletNavigation>();
  const { translate, valueTransfers } = useContext(ContextAppLoaded);
  const { width } = useWindowDimensions();
  const t = (key: string) => translate(key) as string;

  const [creating, setCreating] = useState<boolean>(true);
  /** The last step the send was seen at, which tells where it expired. */
  const [reached, setReached] = useState<SendStep>('nym');
  const sheetRef = useRef<BottomSheetModal>(null);

  const params = route.params;
  const subject = params?.subject;
  const failure = params?.phase === 'failed' ? params.failure : undefined;
  const transfers = valueTransfers ?? [];
  const view: SendView =
    params?.phase === 'created'
      ? followTxids(params.txids, transfers)
      : params?.phase === 'failed'
        ? failedSince(params.stage, params.since, transfers)
        : {
            kind: 'progress',
            step: creating ? 'build' : 'nym',
            confirmations: 0,
            rows: [],
          };
  const pair =
    !!subject?.pair ||
    (params?.phase === 'created' && params.txids.length > 1) ||
    view.rows.length > 1;
  const of = String(GlobalConst.minConfirmations);
  const flightFailure =
    view.kind === 'failed' ? failureOf(view.stage, reached) : undefined;
  const progressStep = view.kind === 'progress' ? view.step : undefined;

  useEffect(() => {
    if (progressStep) {
      setReached(progressStep);
    }
  }, [progressStep]);

  useEffect(() => {
    if (params?.phase !== undefined || !creating) {
      return;
    }
    const timer = setTimeout(() => setCreating(false), BUILD_MS);
    return () => clearTimeout(timer);
  }, [params?.phase, creating]);

  const toHistory = () =>
    navigation.navigate(Route.Home, { screen: Route.History }, { pop: true });
  /**
   * Whatever takes this screen away (the back gesture, Android's back,
   * Done) lands on History: under it is the screen a send or shield started
   * from, never the review of a send that has gone.
   */
  const [leaving, setLeaving] = useState<boolean>(false);
  usePreventRemove(!leaving, () => setLeaving(true));
  useEffect(() => {
    if (leaving) {
      toHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  const openDetail = (vt: ValueTransferType) =>
    navigation.navigate(Route.ValueTransferDetail, {
      index: 0,
      vt,
      valueTransfersSliced: [vt],
      totalLength: 1,
    });
  /** One transaction opens its detail; the two of a TEX send, a sheet with both. */
  const viewTransactions = () =>
    view.rows.length > 1
      ? sheetRef.current?.present()
      : view.rows[0] && openDetail(view.rows[0]);

  const fill = (key: string, n = 0) =>
    t(key)
      .replace('{amount}', subject?.amount ?? '')
      .replace('{who}', subject?.who ?? '')
      .replace('{n}', String(n))
      .replace('{of}', of);
  const two = (key: string) => (pair ? `${key}-two` : key);

  const sent = view.kind === 'progress' && view.step === 'done';
  /** Expired, the words depend on where: through NYM, or waiting for a block. */
  const failedBody =
    view.kind !== 'failed'
      ? ''
      : view.stage === 'expired'
        ? `send.fail-expired-${flightFailure === 'poolexp' ? 'pool' : 'nym'}-body`
        : `send.fail-${view.stage}-body`;
  const title =
    view.kind === 'failed'
      ? t(
          view.partial
            ? `send.fail-${view.stage}-title-2`
            : view.stage === 'expired' && pair
              ? 'send.fail-expired-title-two'
              : `send.fail-${view.stage}-title`,
        )
      : sent
        ? t(
            subject?.kind === 'shield'
              ? 'send.shielded-title'
              : 'send.sent-title',
          )
        : fill(`send.step-${view.step}`, view.confirmations);
  const sub =
    view.kind === 'failed'
      ? t(view.partial ? 'send.fail-partial-body' : two(failedBody))
      : sent
        ? fill(two('send.sent-body'))
        : fill(two(`send.step-${view.step}-sub`), view.confirmations);
  const [shownTitle, titleStyle] = useFadedText(title);
  const [shownSub, subStyle] = useFadedText(sub);

  const viewButton =
    view.rows.length > 0 ? (
      <RiseIn>
        <Button
          testID="computing.view"
          variant="text"
          title={t(
            view.rows.length > 1
              ? 'send.view-transactions'
              : 'send.view-transaction',
          )}
          onPress={viewTransactions}
        />
      </RiseIn>
    ) : undefined;
  const footer = (
    <ButtonStack>
      {viewButton}
      {sent ? (
        <Button
          testID="computing.done"
          variant="primary"
          title={t('send.done')}
          onPress={toHistory}
        />
      ) : (
        <Button
          testID="computing.leave"
          variant="primary"
          title={t('send.back-to-zingo')}
          onPress={toHistory}
        />
      )}
    </ButtonStack>
  );

  const step = STEPS.indexOf(
    flightFailure ? FAILED_AT[flightFailure] : (progressStep ?? 'build'),
  );
  const dotState = (index: number) =>
    flightFailure && index === step
      ? 2
      : flightFailure
        ? Number(index < step)
        : Number(index <= step);

  return (
    <FullPanel title="" center motion="step" footer={footer} testID="computing">
      <View style={{ alignItems: 'center' }}>
        <SendFlight
          step={progressStep}
          failure={flightFailure}
          confirmations={view.kind === 'progress' ? view.confirmations : 0}
          width={width - space20 * 2}
          pair={pair}
        />
        <Animated.View style={titleStyle}>
          <Text
            testID="computing.title"
            variant="subtitle"
            style={{ marginTop: 26, textAlign: 'center' }}
          >
            {shownTitle}
          </Text>
        </Animated.View>
        {!!subject && (
          <Text
            variant="bodySmall"
            tone="muted"
            style={{ marginTop: 4, fontVariant: ['tabular-nums'] }}
          >
            {fill(
              sent || view.kind === 'failed'
                ? 'send.sent-line'
                : pair
                  ? 'send.sending-line-two'
                  : 'send.sending-line',
            )}
          </Text>
        )}
        <Animated.View style={subStyle}>
          <Text
            testID="computing.sub"
            variant="caption"
            tone="muted"
            style={{ marginTop: 8, maxWidth: 270, textAlign: 'center' }}
          >
            {shownSub}
          </Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', columnGap: 6, marginTop: 20 }}>
          {STEPS.map((key, index) => (
            <StepDot key={key} state={dotState(index)} />
          ))}
        </View>
        {view.kind === 'failed' && failure !== undefined && (
          <RiseIn delay={ERROR_AFTER_MS}>
            <ErrorDetails
              subject={title}
              text={
                failure.kind === 'error' ? t(failure.errorKey) : failure.text
              }
            />
          </RiseIn>
        )}
      </View>
      <TransactionsSheet
        ref={sheetRef}
        rows={view.rows}
        onOpen={vt => {
          sheetRef.current?.dismiss();
          openDetail(vt);
        }}
        onClose={() => sheetRef.current?.dismiss()}
      />
    </FullPanel>
  );
};

export default ComputingTxContent;
