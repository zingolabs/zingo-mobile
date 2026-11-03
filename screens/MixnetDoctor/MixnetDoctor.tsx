/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import Button from '@ui/primitives/Button';
import FadeText from '@ui/primitives/FadeText';
import Pressable from '@ui/primitives/Pressable';
import RegText from '@ui/primitives/RegText';
import Header from '@ui/widgets/Header';
import { AppDrawerParamList } from '@app/types';
import { Route } from '@app/AppState';
import { useTheme, radiusMd } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { probeServer } from '@app/walletBackend';
import { mixnetJournal } from '@app/walletBackend/modules/MixnetJournal';
import {
  getMixnetBootstrapDetail,
  getMixnetStatus,
} from '@app/walletBackend/utils/mixnetUtils';
import { viewPhase } from '@app/walletBackend/transforms/mixnetView';
import {
  MixnetDirectProbe,
  MixnetDoctorRow,
  MixnetDoctorRun,
  mixnetDoctorReport,
  mixnetDoctorRows,
  mixnetJournalLine,
} from '@app/walletBackend/transforms/mixnetDoctorReport';
import {
  MixnetDoctorStepState,
  MixnetDoctorTone,
  mixnetDoctorSteps,
  mixnetDoctorVerdict,
} from '@app/walletBackend/transforms/mixnetDoctorVerdict';

type MixnetDoctorProps = NativeStackScreenProps<
  AppDrawerParamList,
  'MixnetDoctor'
>;

/**
 * How often the screen re-reads the wallet's state and the journal. Both are
 * local, so it costs no network.
 */
const REFRESH_MS = 2000;

const NOT_RUN: MixnetDirectProbe = { kind: 'not-run' };

const STEP_MARK: Record<MixnetDoctorStepState, string> = {
  ok: '✓',
  fail: '✗',
  running: '…',
  unchecked: '–',
};

/**
 * A URI has no words to keep whole: left to the line breaker it splits at
 * every `/` and `.`, so a long server spills over three ragged lines. A
 * zero-width space between characters lets it fill each line instead.
 */
const wrapValue = (value: string) =>
  /^[a-z]+:\/\//.test(value) ? value.split('').join('​') : value;

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
      {wrapValue(row.value)}
    </RegText>
  </View>
);

const MixnetDoctor: React.FunctionComponent<MixnetDoctorProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server, addLastSnackbar, reenableMixnet, mixnetView } =
    context;
  const { colors } = useTheme();

  /**
   * The coordinator's own view of the session, which the probes cannot see:
   * it knows an attach is under way while the library still answers `died`.
   */
  const phase = viewPhase(mixnetView);
  const attachInFlight = phase === 'connecting' || phase === 'reconnecting';
  /**
   * Nym rests at `off` because the session is Offline or the device has no
   * network: there is nothing to reach, so the screen says why instead of
   * measuring nothing and offering it for copying.
   */
  const restingOff = phase === 'off';
  const offReason =
    server.kind === 'remote'
      ? 'mixnetdoctor.nonetwork'
      : 'mixnetdoctor.offline';

  const [run, setRun] = useState<MixnetDoctorRun | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [direct, setDirect] = useState<MixnetDirectProbe>(NOT_RUN);
  const [directPhase, setDirectPhase] = useState<string>('');
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [nowMillis, setNowMillis] = useState<number>(Date.now());

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  /** Reads the wallet's state, which is local: this touches no network. */
  const readState = useCallback(async () => {
    const statusStart = Date.now();
    const status = await getMixnetStatus();
    const statusMillis = Date.now() - statusStart;
    const detailStart = Date.now();
    const detail = await getMixnetBootstrapDetail();
    const detailMillis = Date.now() - detailStart;
    setRun({
      serverUri: server.kind === 'remote' ? server.uri : 'offline',
      chainName: server.chainName,
      status,
      statusMillis,
      detail,
      detailMillis,
      direct: NOT_RUN,
    });
    setNowMillis(Date.now());
  }, [server]);

  /**
   * The direct probe leaves from the real IP, so it waits for the button and
   * never runs because a screen was opened.
   */
  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    await readState();
    if (server.kind === 'remote') {
      const result = await probeServer(server.uri);
      setDirect(
        result.ok
          ? { kind: 'probed', probe: result.value }
          : { kind: 'refused', cause: result.error.message },
      );
      setDirectPhase(phase);
    }
    setRunning(false);
  }, [phase, readState, server]);

  /**
   * It keeps following the transport while open, whatever state that is in, so
   * nothing on screen outlives what it describes.
   */
  useEffect(() => {
    if (restingOff) {
      setRun(null);
      return;
    }
    readState();
    const tick = setInterval(readState, REFRESH_MS);
    return () => clearInterval(tick);
  }, [restingOff, readState]);

  const restart = useCallback(async () => {
    setDirect(NOT_RUN);
    await reenableMixnet();
    await readState();
  }, [reenableMixnet, readState]);

  const journal = mixnetJournal.list();

  /**
   * A direct answer speaks for the transport it was taken against: once the
   * transport has moved on, the screen says what is true now, and the probe stays
   * only for the details and the report.
   */
  const input =
    run === null
      ? null
      : {
          status: run.status,
          attachInFlight,
          direct: directPhase === phase ? direct : NOT_RUN,
          recentLosses: mixnetJournal.recentLosses(nowMillis),
        };
  const verdict = input === null ? null : mixnetDoctorVerdict(input);
  const steps =
    input !== null && (running || input.direct.kind !== 'not-run')
      ? mixnetDoctorSteps(input, running)
      : [];
  const measured = run === null ? null : { ...run, direct };

  const copyReport = useCallback(
    (finished: MixnetDoctorRun) => {
      Clipboard.setString(mixnetDoctorReport(finished, mixnetJournal.list()));
      addLastSnackbar(translate('mixnetdoctor.report-copied') as string);
    },
    [addLastSnackbar, translate],
  );

  const toneColor = (tone: MixnetDoctorTone): string => {
    switch (tone) {
      case 'ok':
        return colors.fgAccent;
      case 'warn':
        return colors.fgWarning;
      case 'bad':
        return colors.fgDanger;
      case 'neutral':
        return colors.fgDefault;
    }
  };

  const stepColor = (state: MixnetDoctorStepState): string => {
    switch (state) {
      case 'ok':
        return colors.fgAccent;
      case 'fail':
        return colors.fgDanger;
      case 'running':
      case 'unchecked':
        return colors.fgMuted;
    }
  };

  return (
    <View
      accessible={true}
      accessibilityLabel={translate('mixnetdoctor.title-acc') as string}
      style={{ flex: 1, backgroundColor: colors.bgCanvas, paddingTop: 4 }}
    >
      <Header
        title={translate('mixnetdoctor.title') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
        closeScreen={closeScreen}
        backTestID="mixnetdoctor.back"
        backAccessibilityLabel={translate('mixnetdoctor.back-acc') as string}
      />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View
          style={{
            backgroundColor: colors.bgSurface,
            borderColor: colors.bottomSheetBorder,
            borderWidth: 1,
            borderRadius: radiusMd,
            padding: 20,
            gap: 20,
          }}
        >
          <FadeText>
            {translate(restingOff ? offReason : 'mixnetdoctor.intro') as string}
          </FadeText>

          {!restingOff && verdict !== null && (
            <View style={{ gap: 4 }}>
              <RegText
                testID="mixnetdoctor.headline"
                style={{ color: toneColor(verdict.tone) }}
              >
                {translate(`mixnetdoctor.${verdict.headlineKey}`) as string}
              </RegText>
              <FadeText>
                {translate(`mixnetdoctor.${verdict.detailKey}`) as string}
              </FadeText>
            </View>
          )}

          {steps.length > 0 && (
            <View style={{ gap: 4 }}>
              {steps.map(step => (
                <View
                  key={step.labelKey}
                  style={{ flexDirection: 'row', gap: 8 }}
                >
                  <RegText style={{ color: stepColor(step.state) }}>
                    {STEP_MARK[step.state]}
                  </RegText>
                  <RegText style={{ color: stepColor(step.state) }}>
                    {translate(`mixnetdoctor.${step.labelKey}`) as string}
                  </RegText>
                  {step.state === 'unchecked' && (
                    <FadeText>
                      {translate('mixnetdoctor.not-checked') as string}
                    </FadeText>
                  )}
                </View>
              ))}
            </View>
          )}

          {verdict?.action === 'server' && (
            <Button
              testID="mixnetdoctor.server"
              variant="primary"
              title={translate('mixnetdoctor.choose-server') as string}
              onPress={() => navigation.navigate(Route.Server)}
            />
          )}

          {verdict?.action === 'restart' && (
            <Button
              testID="mixnetdoctor.reenable"
              variant="primary"
              title={translate('mixnetdoctor.restart') as string}
              onPress={restart}
            />
          )}

          <Button
            testID="mixnetdoctor.run"
            variant={verdict?.action === 'none' ? 'primary' : 'text'}
            title={
              running
                ? (translate('mixnetdoctor.running') as string)
                : (translate('mixnetdoctor.run') as string)
            }
            disabled={running || restingOff}
            onPress={runDiagnostics}
          />

          {!restingOff && measured !== null && (
            <Button
              testID="mixnetdoctor.copy"
              variant="text"
              title={translate('mixnetdoctor.copy-report') as string}
              onPress={() => copyReport(measured)}
            />
          )}

          {!restingOff && measured !== null && (
            <Pressable
              kind="row"
              testID="mixnetdoctor.details"
              onPress={() => setDetailsOpen(!detailsOpen)}
            >
              <RegText style={{ color: colors.fgMuted, textAlign: 'center' }}>
                {
                  translate(
                    detailsOpen
                      ? 'mixnetdoctor.details-hide'
                      : 'mixnetdoctor.details',
                  ) as string
                }
              </RegText>
            </Pressable>
          )}

          {!restingOff && measured !== null && detailsOpen && (
            <View style={{ gap: 12 }}>
              <View
                style={{
                  backgroundColor: colors.bgCanvas,
                  borderRadius: radiusMd,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                }}
              >
                {mixnetDoctorRows(measured).map((row, i, rows) => (
                  <DoctorRow
                    key={row.label + i}
                    row={row}
                    last={i === rows.length - 1}
                    labelColor={colors.fgMuted}
                    valueColor={colors.fgDefault}
                    dividerColor={colors.bottomSheetBorder}
                  />
                ))}
              </View>
              <View testID="mixnetdoctor.journal" style={{ gap: 4 }}>
                {journal.length === 0 && (
                  <FadeText>
                    {translate('mixnetdoctor.journal-empty') as string}
                  </FadeText>
                )}
                {[...journal].reverse().map((entry, i) => (
                  <FadeText key={entry.atMillis + entry.kind + i}>
                    {mixnetJournalLine(entry)}
                  </FadeText>
                ))}
              </View>
              <FadeText>{translate('mixnetdoctor.privacy') as string}</FadeText>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default MixnetDoctor;
