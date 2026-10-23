/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { space20, useTheme } from '@app/theme';
import ProgressState from '@ui/widgets/ProgressState';
import RegText from '@ui/primitives/RegText';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import FullPanel from '@ui/widgets/FullPanel';
import SendFlight from '@ui/widgets/Flight/SendFlight';
import SentMark from '@ui/widgets/Flight/SentMark';
import { AppDrawerParamList, WalletNavigation } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { Route } from '@app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

/** How long each step of the send is told before the next one. */
const STEP_MS = 1100;
/** The fade between one step's words and the next. */
const STEP_FADE_MS = 160;
const STEPS = ['send.step-build', 'send.step-proof', 'send.step-nym'];

type ComputingTxContentProps = NativeStackScreenProps<
  AppDrawerParamList,
  'Computing'
>;

/**
 * A send, a shield or a removal on its way out. While it works, a paper
 * plane flies through the mix nodes and the steps are told one by one, the
 * last one staying until the send settles; done, the check draws itself
 * with a sprout on it; failed, it says so with the details behind a tap.
 */
const ComputingTxContent: React.FunctionComponent<ComputingTxContentProps> = ({
  route,
}) => {
  const navigation = useNavigation<WalletNavigation>();
  const { translate, valueTransfers } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const t = (key: string) => translate(key) as string;

  const [step, setStep] = useState<number>(0);
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);
  const fade = useSharedValue(1);

  const params = route.params;
  const phase = params?.phase ?? 'computing';
  const failure = params?.phase === 'failed' ? params.failure : undefined;
  const txid = params?.phase === 'created' ? params.txid : undefined;
  const subject = params?.subject;
  const isCreated = phase === 'created';
  const isFailed = phase === 'failed';

  useEffect(() => {
    if (phase !== 'computing' || step >= STEPS.length - 1) {
      return;
    }
    let swap: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      fade.value = withSequence(
        withTiming(0, {
          duration: STEP_FADE_MS,
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(1, {
          duration: STEP_FADE_MS,
          reduceMotion: ReduceMotion.System,
        }),
      );
      swap = setTimeout(() => setStep(s => s + 1), STEP_FADE_MS);
    }, STEP_MS);
    return () => {
      clearTimeout(timer);
      clearTimeout(swap);
    };
  }, [phase, step, fade]);
  const stepStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const toHistory = () =>
    navigation.navigate(Route.Home, { screen: Route.History });
  const sent = txid
    ? (valueTransfers ?? []).find(vt => vt.txid === txid)
    : undefined;
  /** The new transaction may not be listed yet; then History shows it soon. */
  const viewTransaction = () =>
    sent
      ? navigation.navigate(Route.ValueTransferDetail, {
          index: 0,
          vt: sent,
          valueTransfersSliced: [sent],
          totalLength: 1,
        })
      : toHistory();

  const line = (key: string) =>
    subject
      ? t(key).replace('{amount}', subject.amount).replace('{who}', subject.who)
      : '';

  const footer = isCreated ? (
    <ButtonStack>
      <Button
        testID="computing.view"
        variant="text"
        title={t('send.view-transaction')}
        onPress={viewTransaction}
      />
      <Button
        testID="computing.done"
        variant="primary"
        title={t('send.done')}
        onPress={toHistory}
      />
    </ButtonStack>
  ) : isFailed ? (
    <Button
      variant="primary"
      title={t('loadedapp.continue')}
      onPress={toHistory}
    />
  ) : undefined;

  const heading = (text: string) => (
    <Text
      testID="computing.title"
      variant="subtitle"
      style={{
        marginTop: 28,
        fontSize: 18,
        lineHeight: 24,
        textAlign: 'center',
      }}
    >
      {text}
    </Text>
  );
  const subline = (text: string) => (
    <Text
      variant="bodySmall"
      tone="muted"
      style={{ marginTop: 4, fontVariant: ['tabular-nums'] }}
    >
      {text}
    </Text>
  );

  return (
    <FullPanel title="" center footer={footer} testID="computing">
      <View style={{ alignItems: 'center' }}>
        {isFailed ? (
          <>
            <ProgressState
              state="failed"
              title={t('loadedapp.transactionfailed-title')}
              body={t('loadedapp.transactionfailed-body')}
            />
            {failure !== undefined && (
              <View style={{ marginTop: 16, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setShowErrorDetails(v => !v)}
                  hitSlop={8}
                >
                  <RegText
                    style={{
                      color: colors.fgDanger,
                      textDecorationLine: 'underline',
                    }}
                  >
                    {t('loadedapp.transactionfailed-details')}
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
                    {failure.kind === 'error'
                      ? t(failure.errorKey)
                      : failure.text}
                  </RegText>
                )}
              </View>
            )}
          </>
        ) : isCreated ? (
          <>
            <SentMark />
            {heading(
              subject
                ? t('send.sent-title')
                : t('loadedapp.transactioncreated-title'),
            )}
            {!!subject && subline(line('send.sent-line'))}
            <Text
              variant="caption"
              tone="muted"
              style={{ marginTop: 8, maxWidth: 270, textAlign: 'center' }}
            >
              {subject
                ? t('send.sent-body')
                : t('loadedapp.transactioncreated-body')}
            </Text>
          </>
        ) : (
          <>
            <SendFlight width={width - space20 * 2} />
            <Animated.View style={stepStyle}>
              {heading(t(STEPS[step]))}
            </Animated.View>
            {!!subject && subline(line('send.sending-line'))}
            <View style={{ flexDirection: 'row', columnGap: 6, marginTop: 20 }}>
              {STEPS.map((key, index) => (
                <View
                  key={key}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      index <= step ? colors.fgPriceUp : colors.sheetHandle,
                  }}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </FullPanel>
  );
};

export default ComputingTxContent;
