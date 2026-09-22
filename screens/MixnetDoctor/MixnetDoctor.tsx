/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import Clipboard from '@react-native-clipboard/clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import FadeText from '@ui/primitives/FadeText';
import RegText from '@ui/primitives/RegText';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import Header from '@ui/widgets/Header';
import { AppDrawerParamList } from '@app/types';
import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { RouteEnum, ScreenEnum } from '@app/AppState';
import {
  getMixnetBootstrapDetail,
  getMixnetStatus,
} from '@app/walletBackend/utils/mixnetUtils';
import { RPCMixnetIndicatorEnum } from '@app/walletBackend/enums/RPCMixnetIndicatorEnum';
import { mixnetPhase } from '@app/walletBackend/transforms/mixnetView';
import {
  MixnetDoctorRow,
  MixnetDoctorRun,
  mixnetDoctorReport,
  mixnetDoctorRows,
} from '@app/walletBackend/transforms/mixnetDoctorReport';

type MixnetDoctorProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MixnetDoctor
>;

const SKELETON_WIDTHS = ['70%', '90%', '55%', '80%'] as const;
const REPORT_MIN_HEIGHT = 120;

// One iOS-style row: muted label on the left, value right-aligned.
const DoctorRow = ({
  row,
  last,
  labelColor,
  valueColor,
  dividerColor,
}: {
  row: MixnetDoctorRow;
  last: boolean;
  labelColor: string;
  valueColor: string;
  dividerColor: string;
}) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: dividerColor,
    }}
  >
    <RegText style={{ color: labelColor }}>{row.label}</RegText>
    <RegText style={{ color: valueColor, flex: 1, textAlign: 'right' }}>
      {row.value}
    </RegText>
  </View>
);

// No entrance animation on the screen itself. These drive state changes only:
// the box and its skeleton/report swap fade in place while the box and the
// buttons below it morph to the new layout in sync, so nothing snaps ahead of
// the frame. Fades survive reduced motion; the layout shift does not.
const contentEnter = () =>
  FadeIn.duration(200).reduceMotion(ReduceMotion.Never);
const contentExit = () =>
  FadeOut.duration(140).reduceMotion(ReduceMotion.Never);
const boxMorph = () =>
  LinearTransition.duration(260).reduceMotion(ReduceMotion.System);

// The running placeholder: pulsing bars that occupy the space the report lines
// will fill, so the box does not jump when the run lands.
const ReportSkeleton = ({ color }: { color: string }) => {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      entering={contentEnter()}
      exiting={contentExit()}
      style={[{ gap: 12 }, pulseStyle]}
    >
      {SKELETON_WIDTHS.map(width => (
        <View
          key={width}
          style={{ width, height: 12, borderRadius: 6, backgroundColor: color }}
        />
      ))}
    </Animated.View>
  );
};

// A run the user can act on: the transport is down for good, so restarting it
// is the remedy rather than waiting. A bootstrap is not one of these — it
// arrives on its own — and neither is a reachable mixnet.
//
// `attachInFlight` is what the probe alone cannot see. The library reports a
// transport that has not attached yet as `died` (Unattached fails closed, so
// the mixnet-only surfaces stay shut), which during a connect in progress is
// a state the app is already leaving. Restarting it there would cancel the
// attach and start the same wait again.
const runIsTerminal = (
  finished: MixnetDoctorRun,
  attachInFlight: boolean,
): boolean =>
  !attachInFlight &&
  (finished.status.kind === 'failure' ||
    finished.status.indicator === RPCMixnetIndicatorEnum.died ||
    finished.status.indicator === RPCMixnetIndicatorEnum.off);

const MixnetDoctor: React.FunctionComponent<MixnetDoctorProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server, addLastSnackbar, reenableMixnet, mixnetView } =
    context;
  const { colors } = useTheme();

  // The coordinator's own view of the session, which the probes cannot see:
  // it knows an attach is under way while the library still answers `died`.
  const phase =
    mixnetView !== null
      ? mixnetPhase(mixnetView.statusKey, mixnetView.reconnecting)
      : null;
  const attachInFlight = phase === 'connecting' || phase === 'reconnecting';

  const [run, setRun] = useState<MixnetDoctorRun | null>(null);
  const [running, setRunning] = useState<boolean>(false);

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // Both probes reach the mixnet surface from the real IP. Each is timed, so
  // the report carries a latency the user can compare across runs.
  const runDoctor = useCallback(async () => {
    setRunning(true);
    setRun(null);
    const statusStart = Date.now();
    const status = await getMixnetStatus();
    const statusMillis = Date.now() - statusStart;
    const detailStart = Date.now();
    const detail = await getMixnetBootstrapDetail();
    const detailMillis = Date.now() - detailStart;
    setRun({
      serverUri: server.uri,
      chainName: server.chainName,
      status,
      statusMillis,
      detail,
      detailMillis,
    });
    setRunning(false);
  }, [server.chainName, server.uri]);

  // The screen is opened because something looks wrong, so it answers without
  // being asked twice: the first run starts on entry, and the button below
  // stays for the re-runs the user compares against it.
  useEffect(() => {
    runDoctor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restart the transport and diagnose again, so the screen that reported the
  // trouble also shows whether the remedy worked.
  const restartMixnet = useCallback(async () => {
    setRunning(true);
    setRun(null);
    await reenableMixnet();
    await runDoctor();
  }, [reenableMixnet, runDoctor]);

  const copyReport = useCallback(
    (finished: MixnetDoctorRun) => {
      Clipboard.setString(mixnetDoctorReport(finished));
      addLastSnackbar(translate('mixnetdoctor.report-copied') as string);
    },
    [addLastSnackbar, translate],
  );

  return (
    <View
      accessible={true}
      accessibilityLabel={translate('mixnetdoctor.title-acc') as string}
      style={{ flex: 1, backgroundColor: colors.bgCanvas }}
    >
      <Header
        title={translate('mixnetdoctor.title') as string}
        screenName={ScreenEnum.MixnetDoctor}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
        closeScreen={closeScreen}
      />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Animated.View
          layout={boxMorph()}
          style={{
            backgroundColor: colors.bgSurface,
            borderColor: colors.bottomSheetBorder,
            borderWidth: 1,
            borderRadius: 12,
            padding: 20,
            gap: 20,
          }}
        >
          <FadeText>{translate('mixnetdoctor.intro') as string}</FadeText>

          {(running || run !== null) && (
            <Animated.View
              entering={contentEnter()}
              layout={boxMorph()}
              style={{
                backgroundColor: colors.bgCanvas,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 4,
                minHeight: REPORT_MIN_HEIGHT,
                justifyContent: 'center',
              }}
            >
              {run !== null ? (
                <Animated.View
                  key="report"
                  entering={contentEnter()}
                  exiting={contentExit()}
                >
                  {mixnetDoctorRows(run).map((row, i, rows) => (
                    <DoctorRow
                      key={i}
                      row={row}
                      last={i === rows.length - 1}
                      labelColor={colors.fgMuted}
                      valueColor={colors.fgDefault}
                      dividerColor={colors.bottomSheetBorder}
                    />
                  ))}
                </Animated.View>
              ) : (
                <ReportSkeleton color={colors.bottomSheetBorder} />
              )}
            </Animated.View>
          )}

          {/* A connect in progress reads as lost in the report above, because
              a transport that has not attached fails closed. Say so, rather
              than leave the user with a verdict the app is already undoing. */}
          {attachInFlight && !running && (
            <Animated.View entering={contentEnter()} layout={boxMorph()}>
              <FadeText style={{ textAlign: 'center' }}>
                {translate('mixnetdoctor.attaching') as string}
              </FadeText>
            </Animated.View>
          )}

          <Animated.View layout={boxMorph()}>
            <Button
              testID="mixnetdoctor.run"
              type={ButtonTypeEnum.Primary}
              title={
                running
                  ? (translate('mixnetdoctor.running') as string)
                  : (translate('mixnetdoctor.run') as string)
              }
              disabled={running}
              style={{ alignSelf: 'center' }}
              onPress={runDoctor}
            />
          </Animated.View>

          {!running && run !== null && runIsTerminal(run, attachInFlight) && (
            <Animated.View
              layout={boxMorph()}
              entering={contentEnter()}
              exiting={contentExit()}
            >
              <Button
                testID="mixnetdoctor.reenable"
                type={ButtonTypeEnum.Secondary}
                title={translate('mixnet.reenable') as string}
                style={{ alignSelf: 'center' }}
                onPress={restartMixnet}
              />
            </Animated.View>
          )}

          {!running && run !== null && (
            <Animated.View
              layout={boxMorph()}
              entering={contentEnter()}
              exiting={contentExit()}
            >
              <Button
                testID="mixnetdoctor.copy"
                type={ButtonTypeEnum.Ghost}
                title={translate('mixnetdoctor.copy-report') as string}
                style={{ alignSelf: 'center' }}
                onPress={() => copyReport(run)}
              />
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default MixnetDoctor;
