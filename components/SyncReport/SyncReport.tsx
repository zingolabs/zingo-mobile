/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';

import { useTheme } from '../../app/theme';

import { AppDrawerParamList } from '../../app/types';
import DetailLine from '../Components/DetailLine';
import { ContextAppLoaded } from '../../app/context';

import Header from '../Header';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import RegText from '../Components/RegText';
import BoldText from '../Components/BoldText';
import SheetRim from '../Components/SheetRim';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../Components/Button';
import { createAlert } from '../../app/createAlert';
import { sendEmail } from '../../app/sendEmail';
import Utils from '../../app/utils';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';
//import { ModeEnum } from '../../app/AppState';

type SyncReportProps = NativeStackScreenProps<
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
  const { colors } = useTheme();
  const screenName = ScreenEnum.SyncReport;

  const [maxBlocks, setMaxBlocks] = useState<number>(0);
  const [serverServer, setServerServer] = useState<number>(0);
  const [serverWallet, setServerWallet] = useState<number>(0);

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
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
      >
        <SheetRim />
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
              color={colors.fgAccent}
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
    if (!info.latestBlock) return;
    // Round the chain tip up to the next 5M mark so every row in the
    // chart is a full 5M span — no trailing partial row. The actual
    // tick / label / bar series is derived per row inside `rows`
    // below.
    const ROUND = 5_000_000;
    setMaxBlocks(Math.ceil(info.latestBlock / ROUND) * ROUND);
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
    // Totals shown as plain text under the chart ("X blocks"). The
    // segment percentages used by the chart bar are now derived per
    // row inside `rows` below, so this effect only feeds the labels.
    setServerServer(info.latestBlock || 0);
    setServerWallet(
      info.latestBlock && birthday ? info.latestBlock - birthday : 0,
    );
  }, [info.latestBlock, birthday]);

  // Break the 0…maxBlocks range into one or more 5M-wide rows so the
  // label/tick line never overflows horizontally. Each row carries its
  // own slice of labels, ticks and bar segments computed against that
  // row's window — the union renders identically to the legacy single
  // bar when maxBlocks ≤ 5M, but wraps automatically beyond that.
  const rows = useMemo(() => {
    if (!maxBlocks) return [];
    const ROW_SPAN = 5_000_000;
    const STEP = 500_000;
    const formatLabel = (n: number): string =>
      n === 0 ? '0' : `${n / 1_000_000}M`;
    const birthdayTemp = birthday || 0;
    const latest = info.latestBlock || 0;
    const rowCount = Math.max(1, Math.ceil(maxBlocks / ROW_SPAN));
    return Array.from({ length: rowCount }, (_, r) => {
      const rowStart = r * ROW_SPAN;
      const rowEnd = Math.min((r + 1) * ROW_SPAN, maxBlocks);
      const rowSize = rowEnd - rowStart;
      const rowLabels: string[] = [];
      const rowPoints: number[] = [];
      for (let b = rowStart; b < rowEnd; b += STEP) {
        rowPoints.push(b);
        rowLabels.push(formatLabel(b));
      }
      rowLabels.push(formatLabel(rowEnd));
      const clamp = (v: number): number =>
        Math.max(rowStart, Math.min(rowEnd, v));
      const s1Right = clamp(birthdayTemp);
      const s2Right = clamp(latest);
      const pct = (left: number, right: number): number =>
        ((right - left) * 100) / rowSize;
      return {
        rowLabels,
        rowPoints,
        // Each row occupies a fraction of the parent width proportional
        // to how much of a full 5M span it actually covers — full rows
        // span 100%, the trailing partial row leaves the unused range
        // as empty space so the per-block scale stays uniform across
        // every row.
        rowWidthPct: (rowSize * 100) / ROW_SPAN,
        tickWidthPct: (STEP * 100) / rowSize,
        serv1Percent: pct(rowStart, s1Right),
        serv2Percent: pct(s1Right, s2Right),
        serv3Percent: pct(s2Right, rowEnd),
      };
    });
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
        ref={syncReportSheetRef}
        snapPoints={syncReportSnapPoints}
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
        handleComponent={renderSyncReportHandle}
      >
        <BottomSheetScrollView
          testID="syncreport.scroll-view"
          bounces={false}
          alwaysBounceVertical={false}
          style={{
            flex: 1,
            backgroundColor: colors.bgSurface,
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
                    {rows.map((row, rIdx) => {
                      // Half-step labels ("1.5M") are two chars wider than
                      // whole-step ones ("1M"); with space-between that
                      // width gap drifts the digits away from the tick
                      // column below. We add ~one glyph of marginLeft to
                      // each whole-step label (skipping "0", which sits
                      // flush at the origin) so the digit always lands
                      // over its tick, no matter how many points the
                      // chain height produces.
                      const fontSize = 11;
                      const shift = fontSize * 0.55;
                      return (
                        <View
                          key={rIdx}
                          style={{
                            width: `${row.rowWidthPct}%`,
                            marginTop: rIdx === 0 ? 0 : 12,
                          }}
                        >
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              width: '100%',
                              justifyContent: 'space-between',
                              marginTop: 10,
                            }}
                          >
                            {row.rowLabels.map(
                              (label: string, lIdx: number) => {
                                // The first label of every row sits flush at
                                // the row's left edge (just like "0" in row 1)
                                // so it has to skip the shift too — otherwise
                                // "5M", "10M", … would float right of their
                                // tick.
                                const needsShift =
                                  lIdx > 0 &&
                                  label !== '0' &&
                                  !label.includes('.');
                                return (
                                  <Text
                                    key={label}
                                    style={{
                                      color: colors.fgAccent,
                                      fontSize,
                                      marginLeft: needsShift ? shift : 0,
                                    }}
                                  >
                                    {label}
                                  </Text>
                                );
                              },
                            )}
                          </View>
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              width: '100%',
                            }}
                          >
                            {row.rowPoints.map((point: number) => (
                              <View
                                key={point}
                                style={{
                                  height: 10,
                                  borderRightColor: colors.borderAccent,
                                  borderRightWidth: 1,
                                  borderLeftColor: colors.borderAccent,
                                  borderLeftWidth: 1,
                                  width: `${row.tickWidthPct}%`,
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
                              borderBottomColor: colors.borderAccent,
                              borderBottomWidth: 2,
                              marginBottom: 0,
                            }}
                          >
                            {row.serv1Percent > 0 && (
                              <View
                                style={{
                                  height: 10,
                                  backgroundColor: 'blue',
                                  borderLeftColor: colors.borderAccent,
                                  borderLeftWidth: 1,
                                  borderRightColor: 'blue',
                                  borderRightWidth: 1,
                                  width: `${row.serv1Percent}%`,
                                }}
                              />
                            )}
                            {row.serv2Percent > 0 && (
                              <View
                                style={{
                                  height: 10,
                                  backgroundColor: 'yellow',
                                  borderRightColor: 'yellow',
                                  borderRightWidth: 1,
                                  width: `${row.serv2Percent}%`,
                                  borderBottomColor: 'blue',
                                  borderBottomWidth: 5,
                                }}
                              />
                            )}
                            {row.serv3Percent > 0 && (
                              <View
                                style={{
                                  height: 10,
                                  backgroundColor: '#333333',
                                  borderRightColor: colors.borderAccent,
                                  borderRightWidth: 1,
                                  width: `${row.serv3Percent}%`,
                                }}
                              />
                            )}
                          </View>
                        </View>
                      );
                    })}
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
                        <Text style={{ color: colors.fgAccent }}>
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
                        <Text style={{ color: colors.fgDefault }}>
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
                        <Text style={{ color: colors.fgAccent }}>
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
                          style={{ color: colors.fgDefault }}
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
                          <Text style={{ color: colors.fgDefault }}>
                            {birthday}
                          </Text>
                          <Text style={{ color: colors.fgDefault }}>
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
                              borderLeftColor: colors.borderAccent,
                              borderLeftWidth: 1,
                            }}
                          />
                          <View
                            style={{
                              height: 10,
                              borderRightColor: colors.borderAccent,
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
                          <Text
                            style={{ color: colors.fgDefault, marginRight: 10 }}
                          >
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
                          <Text
                            style={{ color: colors.fgDefault, marginRight: 10 }}
                          >
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
                          <Text
                            style={{ color: colors.fgDefault, marginRight: 10 }}
                          >
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
                          <Text
                            style={{ color: colors.fgDefault, marginRight: 10 }}
                          >
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
                          <Text
                            style={{ color: colors.fgDefault, marginRight: 10 }}
                          >
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
              <ActivityIndicator size="large" color={colors.fgAccent} />
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
                <RegText style={{ marginBottom: 20 }} color={colors.fgDefault}>
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
