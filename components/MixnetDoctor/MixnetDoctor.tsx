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
import RegText from '../Components/RegText';
import Button from '../Components/Button';
import Header from '../Header';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum, ScreenEnum } from '../../app/AppState';
import {
  getMixnetBootstrapDetail,
  getMixnetStatus,
} from '../../app/walletBackend/utils/mixnetUtils';
import {
  MixnetDoctorRun,
  mixnetDoctorLines,
  mixnetDoctorReport,
} from '../../app/walletBackend/transforms/mixnetDoctorReport';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';

type MixnetDoctorProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MixnetDoctor
>;

const MixnetDoctor: React.FunctionComponent<MixnetDoctorProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server, addLastSnackbar } = context;
  const { colors } = useTheme() as ThemeType;

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [run, setRun] = useState<MixnetDoctorRun | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const sheetRef = useRef<BottomSheet>(null);

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // A user-invoked diagnostic: both probes reach the mixnet surface from the
  // real IP, which is why nothing here runs automatically. Each is timed so
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

  const copyReport = useCallback(
    (finished: MixnetDoctorRun) => {
      Clipboard.setString(mixnetDoctorReport(finished));
      addLastSnackbar(translate('mixnetdoctor.report-copied') as string);
    },
    [addLastSnackbar, translate],
  );

  const snapPoints = useFullSheetSnapPoints(containerH, headerH);

  return (
    <View
      accessible={true}
      accessibilityLabel={translate('mixnetdoctor.title-acc') as string}
      style={{ flex: 1, backgroundColor: colors.background }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
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
      </View>
      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        handleComponent={null}
        backgroundStyle={{ backgroundColor: colors.bottomSheetBackground }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 20 }}>
          <FadeText>{translate('mixnetdoctor.intro') as string}</FadeText>
          <View style={{ marginVertical: 12 }}>
            <Button
              testID="mixnetdoctor.run"
              type={ButtonTypeEnum.Primary}
              title={
                running
                  ? (translate('mixnetdoctor.running') as string)
                  : (translate('mixnetdoctor.run') as string)
              }
              disabled={running}
              onPress={runDoctor}
            />
          </View>
          {run !== null && (
            <View style={{ marginBottom: 12 }}>
              {mixnetDoctorLines(run).map(line => (
                <RegText key={line} style={{ marginVertical: 2 }}>
                  {line}
                </RegText>
              ))}
            </View>
          )}
          {!running && run !== null && (
            <View style={{ marginVertical: 8 }}>
              <Button
                testID="mixnetdoctor.copy"
                type={ButtonTypeEnum.Secondary}
                title={translate('mixnetdoctor.copy-report') as string}
                onPress={() => copyReport(run)}
              />
            </View>
          )}
          <TouchableOpacity
            onPress={closeScreen}
            style={{ alignSelf: 'center', margin: 16 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              color={colors.primary}
              size={24}
            />
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

export default MixnetDoctor;
