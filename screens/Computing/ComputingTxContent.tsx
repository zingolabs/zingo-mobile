/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTheme } from '@app/theme';
import BottomSheet, {
  BottomSheetFooter,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import ProgressState, { RING_RED } from '@ui/widgets/ProgressState';
import RegText from '@ui/primitives/RegText';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import AppSheet from '@ui/primitives/AppSheet';
import { AppDrawerParamList } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import Header from '@ui/widgets/Header';
import { RouteEnum, ScreenEnum } from '@app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFullSheetSnapPoints } from '@app/hooks/useFullSheetSnapPoints';

// Time spent on phase 1 ("Computing Transaction...") before swapping the
// copy to phase 2 ("Hang on tight..."). The actual `sendTransaction` runs
// in parallel — whichever finishes first (timer or send) decides what the
// user sees.
const PHASE1_DURATION_MS = 4000;

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
  const end = route.params;
  const phase = end?.phase ?? 'computing';
  const failure = end?.phase === 'failed' ? end.failure : undefined;
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
      <AppSheet
        ref={computingSheetRef}
        snapPoints={computingSnapPoints}
        renderFooter={renderComputingFooter}
        contentStyle={{
          paddingHorizontal: 24,
          paddingTop: 106,
          paddingBottom: 106,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ProgressState
          state={isCreated ? 'done' : isFailed ? 'failed' : 'working'}
          title={
            translate(
              isCreated
                ? 'loadedapp.transactioncreated-title'
                : isFailed
                  ? 'loadedapp.transactionfailed-title'
                  : 'send.sending-title',
            ) as string
          }
          body={
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
        />
        {isFailed && failure !== undefined && (
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
                {failure.kind === 'error'
                  ? (translate(failure.errorKey) as string)
                  : failure.text}
              </RegText>
            )}
          </View>
        )}
      </AppSheet>
    </View>
  );
};

export default ComputingTxContent;
