/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';

import { useTheme } from '@react-navigation/native';

import { AppDrawerParamList, ThemeType } from '../../app/types';
import DetailLine from '../Components/DetailLine';
import { ContextAppLoaded } from '../../app/context';

import Header from '../Header';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import RegText from '../Components/RegText';
import BoldText from '../Components/BoldText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronLeft,
  faCloudDownload,
} from '@fortawesome/free-solid-svg-icons';
import { isEqual } from 'lodash';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { RPCSyncStatusType } from '../../app/walletBackend/types/RPCSyncStatusType';
import { RPCSyncScanRangeStatusType } from '../../app/walletBackend/types/RPCSyncScanRangeStatusType';
import { RPCSyncScanRangePriorityStatusEnum } from '../../app/walletBackend/enums/RPCSyncScanRangePriorityStatusEnum';
import { ButtonTypeEnum, RouteEnum, ScreenEnum } from '../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import Button from '../Components/Button';
import { createAlert } from '../../app/createAlert';
import { sendEmail } from '../../app/sendEmail';
import Utils from '../../app/utils';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';
//import { ModeEnum } from '../../app/AppState';

type SyncReportProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.SyncReport
>;

const SyncReport: React.FunctionComponent<SyncReportProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    syncingStatus,
    birthday,
    translate,
    backgroundSyncInfo,
    language,
    netInfo,
    info,
    zingolibVersion,
    setBackgroundError,
    addLastSnackbar,
    setBackgroundSyncErrorInfo,
  } = context; //mode
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.SyncReport;

  const [maxBlocks, setMaxBlocks] = useState<number>(0);
  const [points, setPoints] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [serverServer, setServerServer] = useState<number>(0);
  const [serverWallet, setServerWallet] = useState<number>(0);
  const [server1Percent, setServer1Percent] = useState<number>(0);
  const [server2Percent, setServer2Percent] = useState<number>(0);
  const [server3Percent, setServer3Percent] = useState<number>(0);

  const [percentageOutputsScanned, setPercentageOutputsScanned] =
    useState<number>(0);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(true);
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const syncReportSheetRef = useRef<BottomSheet>(null);

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const syncReportSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const renderSyncReportHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderTopColor: colors.bottomSheetBorder,
          borderLeftColor: colors.bottomSheetBorder,
          borderRightColor: colors.bottomSheetBorder,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            onPress={closeScreen}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            {translate('report.title') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, closeScreen, translate],
  );

  useEffect(() => {
    if (info.latestBlock) {
      (async () => {
        const a = [
          0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000, 3500000,
          4000000, 4500000, 5000000, 5500000, 6000000, 6500000, 7000000,
          7500000, 8000000, 8500000, 9000000, 9500000, 10000000,
        ];
        const l = [
          '0',
          '500K',
          '1M',
          '1.5M',
          '2M',
          '2.5M',
          '3M',
          '3.5M',
          '4M',
          '4.5M',
          '5M',
          '5.5M',
          '6M',
          '6.5M',
          '7M',
          '7.5M',
          '8M',
          '8.5M',
          '9M',
          '9.5M',
          '10M',
        ];
        for (let i = 0; i < a.length; i++) {
          if (info.latestBlock < a[i]) {
            setMaxBlocks(a[i]);
            setPoints(a.slice(0, i));
            setLabels(l.slice(0, i + 1));
            break;
          }
        }
      })();
    }
  }, [info.latestBlock]);

  useEffect(() => {
    if (
      !syncingStatus ||
      isEqual(syncingStatus, {} as RPCSyncStatusType) ||
      (!!syncingStatus.scan_ranges && syncingStatus.scan_ranges.length === 0) ||
      syncingStatus.percentage_total_outputs_scanned === 0
    ) {
      // if the App is waiting for the first fetching, let's put 0.
      setPercentageOutputsScanned(0);
      setSyncInProgress(true);
    } else {
      setPercentageOutputsScanned(
        syncingStatus.percentage_total_outputs_scanned ??
          syncingStatus.percentage_total_blocks_scanned ??
          0,
      );
      setSyncInProgress(
        !!syncingStatus.scan_ranges &&
          syncingStatus.scan_ranges.length > 0 &&
          (syncingStatus.percentage_total_outputs_scanned ??
            syncingStatus.percentage_total_blocks_scanned ??
            0) < 100,
      );
    }
  }, [
    syncingStatus,
    syncingStatus.percentage_total_outputs_scanned,
    syncingStatus.percentage_total_blocks_scanned,
    syncingStatus.scan_ranges,
  ]);

  useEffect(() => {
    /*
    SERVER points:
    - server0 : first block of the server -> 0
    - server1 : wallet's birthday
    - server2 : server last block
    - server3 : empty part of the server bar
    */

    const serv1: number = birthday || 0;
    const serv2: number =
      info.latestBlock && birthday ? info.latestBlock - birthday : 0;
    const serv3: number = maxBlocks ? maxBlocks - serv1 - serv2 : 0;
    const serv1Percent: number = (serv1 * 100) / maxBlocks;
    const serv2Percent: number = (serv2 * 100) / maxBlocks;
    const serv3Percent: number = (serv3 * 100) / maxBlocks;

    /*
      serverServer : blocks of the server
      serverWallet : blocks of the wallet
    */

    const servServer: number = info.latestBlock || 0;
    const servWallet: number =
      info.latestBlock && birthday ? info.latestBlock - birthday : 0;

    setServerServer(servServer);
    setServerWallet(servWallet);
    setServer1Percent(serv1Percent);
    setServer2Percent(serv2Percent);
    setServer3Percent(serv3Percent);
  }, [maxBlocks, info.latestBlock, birthday]);

  const reportError = (error: string) => {
    createAlert(
      setBackgroundError,
      addLastSnackbar,
      'Background Sync Error',
      error,
      false,
      translate,
      sendEmail,
      zingolibVersion,
    );
    setBackgroundSyncErrorInfo('');
  };

  //console.log('render sync report. background:', background);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
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
        ref={syncReportSheetRef}
        snapPoints={syncReportSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderSyncReportHandle}
      >
        <BottomSheetScrollView
          testID="syncreport.scroll-view"
          bounces={false}
          alwaysBounceVertical={false}
          style={{
            flex: 1,
            backgroundColor: colors.bottomSheetBackground,
          }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}
        >
          {(!netInfo.isConnected ||
            netInfo.type === NetInfoStateType.cellular ||
            netInfo.isConnectionExpensive) && (
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                marginHorizontal: 20,
              }}
            >
              <DetailLine label={translate('report.networkstatus') as string}>
                <View style={{ display: 'flex', flexDirection: 'column' }}>
                  {!netInfo.isConnected && (
                    <RegText color="red">
                      {' '}
                      {translate('report.nointernet') as string}{' '}
                    </RegText>
                  )}
                  {netInfo.type === NetInfoStateType.cellular && (
                    <RegText color="yellow">
                      {' '}
                      {translate('report.cellulardata') as string}{' '}
                    </RegText>
                  )}
                  {netInfo.isConnectionExpensive && (
                    <RegText color="yellow">
                      {' '}
                      {translate('report.connectionexpensive') as string}{' '}
                    </RegText>
                  )}
                </View>
              </DetailLine>
              <FontAwesomeIcon
                icon={faCloudDownload}
                color={!netInfo.isConnected ? 'red' : 'yellow'}
                size={16}
                style={{ marginBottom: 5, marginLeft: 5 }}
              />
            </View>
          )}
          {!!maxBlocks && netInfo.isConnected ? (
            <>
              <View
                style={{
                  display: 'flex',
                  marginHorizontal: 20,
                  marginBottom: 30,
                }}
              >
                <DetailLine
                  label={translate('report.syncstatus') as string}
                  value={
                    syncInProgress
                      ? (translate('report.running') as string) +
                        ` ${percentageOutputsScanned > 0 ? percentageOutputsScanned + '%' : ''}`
                      : (translate('report.finished') as string)
                  }
                />

                <View
                  style={{
                    height: 2,
                    width: '100%',
                    backgroundColor: 'white',
                    marginTop: 15,
                    marginBottom: 10,
                  }}
                />

                {!!maxBlocks && serverServer > 0 && serverWallet > 0 && (
                  <>
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        justifyContent: 'space-between',
                        marginTop: 10,
                      }}
                    >
                      {labels.map((label: string) => (
                        <Text key={label} style={{ color: colors.primary }}>
                          {label}
                        </Text>
                      ))}
                    </View>
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                      }}
                    >
                      {points.map((point: number) => (
                        <View
                          key={point}
                          style={{
                            height: 10,
                            borderRightColor: colors.primary,
                            borderRightWidth: 1,
                            borderLeftColor: colors.primary,
                            borderLeftWidth: 1,
                            width: `${(points[1] * 100) / maxBlocks}%`,
                          }}
                        />
                      ))}
                    </View>
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        width: '100%',
                        borderBottomColor: colors.primary,
                        borderBottomWidth: 2,
                        marginBottom: 0,
                      }}
                    >
                      {server1Percent >= 0 && (
                        <View
                          style={{
                            height: 10,
                            backgroundColor: 'blue',
                            borderLeftColor: colors.primary,
                            borderLeftWidth: 1,
                            borderRightColor: 'blue',
                            borderRightWidth: server1Percent > 0 ? 1 : 0,
                            width: `${server1Percent}%`,
                          }}
                        />
                      )}
                      {server2Percent >= 0 && (
                        <View
                          style={{
                            height: 10,
                            backgroundColor: 'yellow',
                            borderRightColor: 'yellow',
                            borderRightWidth: server2Percent > 0 ? 1 : 0,
                            width: `${server2Percent}%`,
                            borderBottomColor: 'blue',
                            borderBottomWidth: 5,
                          }}
                        />
                      )}
                      {server3Percent >= 0 && (
                        <View
                          style={{
                            height: 10,
                            backgroundColor: '#333333',
                            borderRightColor: colors.primary,
                            borderRightWidth: 1,
                            width: `${server3Percent}%`,
                          }}
                        />
                      )}
                    </View>
                    {serverServer > 0 && (
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          width: '100%',
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          marginTop: 5,
                        }}
                      >
                        <Text style={{ color: colors.primary }}>
                          {translate('report.server-title') as string}
                        </Text>
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            width: 10,
                            height: 10,
                            justifyContent: 'flex-start',
                            backgroundColor: 'blue',
                            margin: 5,
                          }}
                        />
                        <Text style={{ color: colors.text }}>
                          {serverServer +
                            (translate('report.blocks') as string)}
                        </Text>
                      </View>
                    )}
                    {serverWallet > 0 && (
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          width: '100%',
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          marginTop: 5,
                        }}
                      >
                        <Text style={{ color: colors.primary }}>
                          {translate('report.wallet') as string}
                        </Text>
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            width: 10,
                            height: 10,
                            justifyContent: 'flex-start',
                            backgroundColor: 'yellow',
                            margin: 5,
                          }}
                        />
                        <Text
                          testID="syncreport.wallettotalblocks"
                          style={{ color: colors.text }}
                        >
                          {serverWallet +
                            (translate('report.blocks') as string)}
                        </Text>
                      </View>
                    )}

                    <View
                      style={{
                        height: 2,
                        width: '100%',
                        backgroundColor: 'white',
                        marginTop: 15,
                        marginBottom: 10,
                      }}
                    />
                  </>
                )}

                {!!maxBlocks && percentageOutputsScanned > 0 && (
                  <>
                    <DetailLine label={translate('report.map') as string}>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          width: '100%',
                          justifyContent: 'space-between',
                          marginTop: 5,
                        }}
                      >
                        <>
                          <Text style={{ color: colors.text }}>{birthday}</Text>
                          <Text style={{ color: colors.text }}>
                            {info.latestBlock}
                          </Text>
                        </>
                      </View>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          width: '100%',
                          justifyContent: 'space-between',
                        }}
                      >
                        <>
                          <View
                            style={{
                              height: 10,
                              borderLeftColor: colors.primary,
                              borderLeftWidth: 1,
                            }}
                          />
                          <View
                            style={{
                              height: 10,
                              borderRightColor: colors.primary,
                              borderRightWidth: 1,
                            }}
                          />
                        </>
                      </View>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'flex-start',
                          width: '100%',
                          borderBottomColor: 'green',
                          borderBottomWidth: 0,
                          marginBottom: 0,
                        }}
                      >
                        {!!syncingStatus.scan_ranges &&
                          syncingStatus.scan_ranges.map(
                            (range: RPCSyncScanRangeStatusType) => {
                              const percent: number =
                                ((range.end_block - range.start_block) * 100) /
                                (info.latestBlock - birthday);
                              return (
                                <View
                                  key={`${range.start_block.toString() + '-' + range.end_block.toString()}`}
                                  style={{
                                    height: 15,
                                    width: `${percent}%`,
                                    backgroundColor:
                                      range.priority ===
                                      RPCSyncScanRangePriorityStatusEnum.Scanning
                                        ? 'orange' /* Scanning */
                                        : range.priority ===
                                            RPCSyncScanRangePriorityStatusEnum.Scanned
                                          ? 'green' /* Scanned  */
                                          : range.priority ===
                                              RPCSyncScanRangePriorityStatusEnum.ScannedWithoutMapping
                                            ? 'green' /* Scanned  */
                                            : range.priority ===
                                                RPCSyncScanRangePriorityStatusEnum.Historic
                                              ? 'gray' /* Low priority */
                                              : range.priority ===
                                                  RPCSyncScanRangePriorityStatusEnum.OpenAdjacent
                                                ? 'blue' /* High priority */
                                                : range.priority ===
                                                    RPCSyncScanRangePriorityStatusEnum.FoundNote
                                                  ? 'blue' /* High priority */
                                                  : range.priority ===
                                                      RPCSyncScanRangePriorityStatusEnum.ChainTip
                                                    ? 'blue' /* High priority */
                                                    : range.priority ===
                                                        RPCSyncScanRangePriorityStatusEnum.Verify
                                                      ? 'blue' /* High priority */
                                                      : range.priority ===
                                                          RPCSyncScanRangePriorityStatusEnum.RefetchingNullifiers
                                                        ? 'darkorange' /* Refetching spends */
                                                        : 'red' /* error somehow */,
                                  }}
                                />
                              );
                            },
                          )}
                      </View>
                    </DetailLine>
                    <DetailLine label={translate('report.legend') as string}>
                      <View
                        style={{
                          display: 'flex',
                          width: '100%',
                          justifyContent: 'flex-start',
                          alignItems: 'flex-start',
                          marginTop: 5,
                          marginLeft: 10,
                        }}
                      >
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'nowrap',
                          }}
                        >
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              width: 10,
                              height: 10,
                              justifyContent: 'flex-start',
                              backgroundColor: 'green',
                              margin: 5,
                            }}
                          />
                          <Text style={{ color: colors.text, marginRight: 10 }}>
                            {translate('report.scanned') as string}
                          </Text>
                        </View>
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'nowrap',
                          }}
                        >
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              width: 10,
                              height: 10,
                              justifyContent: 'flex-start',
                              backgroundColor: 'orange',
                              margin: 5,
                            }}
                          />
                          <Text style={{ color: colors.text, marginRight: 10 }}>
                            {translate('report.scanning') as string}
                          </Text>
                        </View>
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'nowrap',
                          }}
                        >
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              width: 10,
                              height: 10,
                              justifyContent: 'flex-start',
                              backgroundColor: 'darkorange',
                              margin: 5,
                            }}
                          />
                          <Text style={{ color: colors.text, marginRight: 10 }}>
                            {translate('report.refetching') as string}
                          </Text>
                        </View>
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'nowrap',
                          }}
                        >
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              width: 10,
                              height: 10,
                              justifyContent: 'flex-start',
                              backgroundColor: 'gray',
                              margin: 5,
                            }}
                          />
                          <Text style={{ color: colors.text, marginRight: 10 }}>
                            {translate('report.lowpriority') as string}
                          </Text>
                        </View>
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'nowrap',
                          }}
                        >
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              width: 10,
                              height: 10,
                              justifyContent: 'flex-start',
                              backgroundColor: 'blue',
                              margin: 5,
                            }}
                          />
                          <Text style={{ color: colors.text, marginRight: 10 }}>
                            {translate('report.highpriority') as string}
                          </Text>
                        </View>
                      </View>
                    </DetailLine>
                  </>
                )}
              </View>
            </>
          ) : (
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 20,
              }}
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          {(Number(backgroundSyncInfo.date) > 0 ||
            Number(backgroundSyncInfo.dateEnd) > 0 ||
            !!backgroundSyncInfo.message ||
            !!backgroundSyncInfo.error) && (
            <View
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                marginHorizontal: 20,
                width: '100%',
                marginBottom: 20,
              }}
            >
              <DetailLine
                label={translate('report.lastbackgroundsync') as string}
                value={
                  //background.batches.toString() +
                  //translate('report.batches-date') +
                  Utils.formatDate(
                    Number(Number(backgroundSyncInfo.date).toFixed(0)) * 1000,
                    'yyyy MMM d h:mm:ss aaa',
                    language,
                  ) +
                  (Number(backgroundSyncInfo.dateEnd) > 0 &&
                  Number(backgroundSyncInfo.date) !==
                    Number(backgroundSyncInfo.dateEnd)
                    ? Utils.formatDate(
                        Number(Number(backgroundSyncInfo.date).toFixed(0)) *
                          1000,
                        'yyyy MMM d',
                        language,
                      ) ===
                      Utils.formatDate(
                        Number(Number(backgroundSyncInfo.dateEnd).toFixed(0)) *
                          1000,
                        'yyyy MMM d',
                        language,
                      )
                      ? ' - ' +
                        Utils.formatDate(
                          Number(
                            Number(backgroundSyncInfo.dateEnd).toFixed(0),
                          ) * 1000,
                          'h:mm:ss aaa',
                          language,
                        )
                      : ' - ' +
                        Utils.formatDate(
                          Number(
                            Number(backgroundSyncInfo.dateEnd).toFixed(0),
                          ) * 1000,
                          'yyyy MMM d h:mm:ss aaa',
                          language,
                        )
                    : '')
                }
              />
              {!!backgroundSyncInfo.message && (
                <RegText style={{ marginBottom: 20 }} color={colors.text}>
                  {backgroundSyncInfo.message}
                </RegText>
              )}
              {!!backgroundSyncInfo.error && (
                <Button
                  type={ButtonTypeEnum.Primary}
                  title={translate('view-error') as string}
                  onPress={() => {
                    reportError(
                      backgroundSyncInfo.error ? backgroundSyncInfo.error : '',
                    );
                  }}
                  twoButtons={true}
                />
              )}
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

export default SyncReport;
