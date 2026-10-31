/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { space20, useTheme, radiusPill, slopFor, iconSizeSm } from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import { duration } from '@app/theme/motion';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import FullPanel from '@ui/widgets/FullPanel';
import SendFlight from '@ui/widgets/Flight/SendFlight';
import SentMark from '@ui/widgets/Flight/SentMark';
import { AppDrawerParamList, WalletNavigation } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { GlobalConst, Route, ValueTransferType } from '@app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { STEPS, SendView, failedSince, followTxids } from './sendProgress';
import TransactionsSheet from './TransactionsSheet';

/**
 * How long Creating is told before Through NYM. The backend creates and
 * sends in one call, so this switch is the only step a clock decides.
 */
const BUILD_MS = 2 * duration.hero;
/** The fade between one step's words and the next. */
const STEP_FADE_MS = duration.step;

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

/**
 * A send or a shield, followed from the moment it leaves to its last
 * confirmation: Creating, Through NYM, In the mempool, Confirming 1 to 3 of
 * 3, then the check with its sprout. While the backend works, a clock moves
 * Creating to Through NYM; once it answers with the txids, the
 * transactions' own state tells the rest, so leaving and coming back from
 * History finds it at the right step. A send that fails says where, with a
 * red cross.
 */
const ComputingTxContent: React.FunctionComponent<ComputingTxContentProps> = ({
  route,
}) => {
  const navigation = useNavigation<WalletNavigation>();
  const { translate, valueTransfers } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const t = (key: string) => translate(key) as string;

  const [creating, setCreating] = useState<boolean>(true);
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);
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
  const title =
    view.kind === 'failed'
      ? t(
          view.partial
            ? `send.fail-${view.stage}-title-2`
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
      ? t(
          view.partial
            ? 'send.fail-partial-body'
            : two(`send.fail-${view.stage}-body`),
        )
      : sent
        ? fill(two('send.sent-body'))
        : fill(two(`send.step-${view.step}-sub`), view.confirmations);
  const [shownTitle, titleStyle] = useFadedText(title);
  const [shownSub, subStyle] = useFadedText(sub);

  const viewButton =
    view.rows.length > 0 ? (
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

  const step = view.kind === 'progress' ? STEPS.indexOf(view.step) : -1;

  return (
    <FullPanel title="" center motion="step" footer={footer} testID="computing">
      <View style={{ alignItems: 'center' }}>
        {view.kind === 'failed' ? (
          <SentMark kind="failed" />
        ) : sent ? (
          <SentMark />
        ) : (
          <SendFlight
            step={view.step === 'done' ? 'conf' : view.step}
            confirmations={view.confirmations}
            pair={pair}
            width={width - space20 * 2}
          />
        )}
        <Animated.View style={titleStyle}>
          <Text
            testID="computing.title"
            variant="subtitle"
            style={{ marginTop: 32, textAlign: 'center' }}
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
        {step >= 0 && !sent && (
          <View style={{ flexDirection: 'row', columnGap: 8, marginTop: 20 }}>
            {STEPS.map((key, index) => (
              <View
                key={key}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: radiusPill,
                  backgroundColor:
                    index < step
                      ? colors.fgAccent
                      : index === step
                        ? colors.fgWarning
                        : colors.borderMuted,
                }}
              />
            ))}
          </View>
        )}
        {view.kind === 'failed' && failure !== undefined && (
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <Pressable
              kind="link"
              onPress={() => setShowErrorDetails(v => !v)}
              hitSlop={slopFor(iconSizeSm)}
            >
              <Text
                variant="caption"
                tone="danger"
                style={{
                  fontWeight: '700',
                  textDecorationLine: 'underline',
                }}
              >
                {t('loadedapp.transactionfailed-details')}
              </Text>
            </Pressable>
            {showErrorDetails && (
              <Text
                variant="caption"
                tone="muted"
                style={{ marginTop: 12, textAlign: 'center' }}
              >
                {failure.kind === 'error' ? t(failure.errorKey) : failure.text}
              </Text>
            )}
          </View>
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
