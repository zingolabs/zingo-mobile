/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';

import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Clipboard from '@react-native-clipboard/clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import Header from '../Header';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum, ScreenEnum } from '../../app/AppState';
import { serverUris } from '../../app/uris';
import {
  connectionDoctorReport,
  doctorRunLines,
  DoctorRun,
  interpretServerProbe,
  interpretSyncProbe,
  probeServer,
  probeSyncServer,
} from '../../app/walletBackend';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';

type ConnectionDoctorProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.ConnectionDoctor
>;

const ConnectionDoctor: React.FunctionComponent<ConnectionDoctorProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server, addLastSnackbar } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.ConnectionDoctor;

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [runs, setRuns] = useState<DoctorRun[]>([]);
  const [running, setRunning] = useState<boolean>(false);
  const sheetRef = useRef<BottomSheet>(null);

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // The current server first, then the stock list for its chain. A
  // user-invoked diagnostic: every probe contacts its target from the real
  // IP, which is why nothing here runs automatically.
  const targets = useCallback((): string[] => {
    const stock = serverUris(translate)
      .filter(s => s.chainName === server.chainName && !s.obsolete)
      .map(s => s.uri);
    return [server.uri, ...stock.filter(uri => uri !== server.uri)];
  }, [server.chainName, server.uri, translate]);

  const runDoctor = useCallback(async () => {
    setRunning(true);
    setRuns([]);
    // Sequential on purpose: results render as they land, and one dead
    // target never multiplies load on the rest. The staged sync-path probe
    // runs for every server; the paired covered-surface probe runs for the
    // current server only.
    for (const uri of targets()) {
      const sync = interpretSyncProbe(await probeSyncServer(uri));
      const run: DoctorRun =
        uri === server.uri
          ? {
              kind: 'currentServer',
              uri,
              sync,
              paired: interpretServerProbe(await probeServer(uri)),
            }
          : { kind: 'stockServer', uri, sync };
      setRuns(prior => [...prior, run]);
    }
    setRunning(false);
  }, [server.uri, targets]);

  const copyReport = useCallback(
    (finished: DoctorRun[]) => {
      Clipboard.setString(connectionDoctorReport(finished));
      addLastSnackbar(translate('connectiondoctor.report-copied') as string);
    },
    [addLastSnackbar, translate],
  );

  const snapPoints = useFullSheetSnapPoints(containerH, headerH);

  return (
    <View
      accessible={true}
      accessibilityLabel={translate('connectiondoctor.title-acc') as string}
      style={{ flex: 1, backgroundColor: colors.background }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}>
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={translate('connectiondoctor.title') as string}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          closeScreen={closeScreen}
          screenName={screenName}
        />
      </View>
      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        handleComponent={null}
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: colors.bottomSheetBackground }}>
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          <FadeText>{translate('connectiondoctor.intro') as string}</FadeText>
          <View style={{ marginVertical: 10 }}>
            <Button
              testID="connectiondoctor.run"
              type={ButtonTypeEnum.Primary}
              title={
                running
                  ? (translate('connectiondoctor.running') as string)
                  : (translate('connectiondoctor.run') as string)
              }
              disabled={running}
              onPress={runDoctor}
            />
          </View>
          {runs.map(run => (
            <View key={run.uri} style={{ marginBottom: 12 }}>
              <BoldText>{run.uri}</BoldText>
              {doctorRunLines(run).map(line => (
                <FadeText key={line} style={{ marginLeft: 10 }}>
                  {line}
                </FadeText>
              ))}
            </View>
          ))}
          {!running && runs.length > 0 && (
            <View style={{ marginVertical: 10 }}>
              <Button
                testID="connectiondoctor.copy"
                type={ButtonTypeEnum.Secondary}
                title={translate('connectiondoctor.copy-report') as string}
                onPress={() => copyReport(runs)}
              />
            </View>
          )}
          <TouchableOpacity onPress={closeScreen} style={{ alignSelf: 'center', margin: 16 }}>
            <FontAwesomeIcon icon={faChevronLeft} color={colors.primary} size={24} />
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

export default ConnectionDoctor;
