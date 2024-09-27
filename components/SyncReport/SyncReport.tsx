/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../../app/types';
import Button from '../Components/Button';
import DetailLine from '../Components/DetailLine';
import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import RPC from '../../app/rpc';
import Header from '../Header';
import { NetInfoStateType } from '@react-native-community/netinfo';
import RegText from '../Components/RegText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCloudDownload } from '@fortawesome/free-solid-svg-icons';
import Utils from '../../app/utils';
import { ButtonTypeEnum, GlobalConst } from '../../app/AppState';

type SyncReportProps = {
  closeModal: () => void;
};

const SyncReport: React.FunctionComponent<SyncReportProps> = ({ closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { syncingStatus, wallet, translate, background, language, netInfo } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [maxBlocks, setMaxBlocks] = useState<number>(0);
  const [points, setPoints] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [showBackgroundLegend, setShowBackgroundLegend] = useState<boolean>(true);
  const [serverServer, setServerServer] = useState<number>(0);
  const [serverWallet, setServerWallet] = useState<number>(0);
  const [server1Percent, setServer1Percent] = useState<number>(0);
  const [server2Percent, setServer2Percent] = useState<number>(0);
  const [server3Percent, setServer3Percent] = useState<number>(0);
  const [processEndBlockFixed, setProcessEndBlockFixed] = useState<number>(0);
  const [walletOldSyncedPercent, setWalletOldSyncedPercent] = useState<number>(0);
  const [walletNewSyncedPercent, setWalletNewSyncedPercent] = useState<number>(0);
  const [walletForSyncedPercent, setWalletForSyncedPercent] = useState<number>(0);
  const [wallet1, setWallet1] = useState<number>(0);
  const [wallet2, setWallet2] = useState<number>(0);
  const [wallet3, setWallet3] = useState<number>(0);

  useEffect(() => {
    if (syncingStatus.lastBlockServer) {
      (async () => {
        const a = [
          0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000, 3500000, 4000000, 4500000, 5000000, 5500000, 6000000,
          6500000, 7000000, 7500000, 8000000, 8500000, 9000000, 9500000, 10000000,
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
          if (syncingStatus.lastBlockServer < a[i]) {
            setMaxBlocks(a[i]);
            setPoints(a.slice(0, i));
            setLabels(l.slice(0, i + 1));
            break;
          }
        }
      })();
    }
  }, [syncingStatus.lastBlockServer]);

  // because this screen is fired from more places than the menu.
  useEffect(() => {
    (async () => await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false))();
    setTimeout(() => setShowBackgroundLegend(false), 10000); // 10 seconds only
  }, []);

  useEffect(() => {
    // ref: https://github.com/zingolabs/zingo-mobile/issues/327
    // I have to subtract 1 here, almost always.
    // when end block process & last block wallet are equal, don't subtract anything.
    // when end block process & wallet birthday are equal, don't subtract anything.
    let processEndBlockFi = 0;
    if (
      syncingStatus.processEndBlock &&
      syncingStatus.processEndBlock !== wallet.birthday &&
      syncingStatus.processEndBlock < syncingStatus.lastBlockWallet
    ) {
      processEndBlockFi = syncingStatus.processEndBlock - 1;
    } else {
      processEndBlockFi = syncingStatus.processEndBlock;
    }

    /*
    SERVER points:
    - server0 : first block of the server -> 0
    - server1 : wallet's birthday
    - server2 : server last block
    - server3 : empty part of the server bar
    */

    const serv1: number = wallet.birthday || 0;
    const serv2: number =
      syncingStatus.lastBlockServer && wallet.birthday ? syncingStatus.lastBlockServer - wallet.birthday : 0;
    const serv3: number = maxBlocks ? maxBlocks - serv1 - serv2 : 0;
    const serv1Percent: number = (serv1 * 100) / maxBlocks;
    const serv2Percent: number = (serv2 * 100) / maxBlocks;
    const serv3Percent: number = (serv3 * 100) / maxBlocks;

    /*
      serverServer : blocks of the server
      serverWallet : blocks of the wallet
    */

    const servServer: number = syncingStatus.lastBlockServer || 0;
    const servWallet: number =
      syncingStatus.lastBlockServer && wallet.birthday ? syncingStatus.lastBlockServer - wallet.birthday : 0;

    /*
      WALLET points:
      - wallet0 : birthday of the wallet
      - wallet1 : first block of the sync process (endBlock)
      - wallet2 : current block of the sync process
      - wallet3 : empty part of the wallet bar

      EDGE case: sometimes when you restore from seed & you don't remember the
      birthday the sync process have to start from 419200... so your wallet have
      this birthday. But sometimes in some point of the sync process the server can
      give you the real birthday... so the process start point is older than the
      birthday, even if it seems wrong/weird, this screen show the right info.
    */

    let wall1: number =
      processEndBlockFi && wallet.birthday
        ? processEndBlockFi >= wallet.birthday
          ? processEndBlockFi - wallet.birthday
          : processEndBlockFi
        : 0;
    let wall2: number =
      syncingStatus.currentBlock && processEndBlockFi ? syncingStatus.currentBlock - processEndBlockFi : 0;

    // It is really weird, but don't want any negative values in the UI.
    if (wall1 < 0) {
      wall1 = 0;
    }
    if (wall2 < 0) {
      wall2 = 0;
    }

    const wall3: number =
      syncingStatus.lastBlockServer && wallet.birthday
        ? processEndBlockFi >= wallet.birthday
          ? syncingStatus.lastBlockServer - wallet.birthday - wall1 - wall2
          : syncingStatus.lastBlockServer - processEndBlockFi - wall1 - wall2
        : 0;

    let walletOldSyncedPer: number = (wall1 * 100) / servWallet;
    let walletNewSyncedPer: number = (wall2 * 100) / servWallet;
    if (walletOldSyncedPer < 0.01 && walletOldSyncedPer > 0) {
      walletOldSyncedPer = 0.01;
    }
    if (walletOldSyncedPer > 100) {
      walletOldSyncedPer = 100;
    }
    if (walletNewSyncedPer < 0.01 && walletNewSyncedPer > 0) {
      walletNewSyncedPer = 0.01;
    }
    if (walletNewSyncedPer > 100) {
      walletNewSyncedPer = 100;
    }
    const walletForSyncedPer: number = 100 - walletOldSyncedPer - walletNewSyncedPer;

    setServerServer(servServer);
    setServerWallet(servWallet);
    setServer1Percent(serv1Percent);
    setServer2Percent(serv2Percent);
    setServer3Percent(serv3Percent);
    setProcessEndBlockFixed(processEndBlockFi);
    setWalletOldSyncedPercent(walletOldSyncedPer);
    setWalletNewSyncedPercent(walletNewSyncedPer);
    setWalletForSyncedPercent(walletForSyncedPer);
    setWallet1(wall1);
    setWallet2(wall2);
    setWallet3(wall3);
  }, [
    maxBlocks,
    syncingStatus.currentBlock,
    syncingStatus.lastBlockServer,
    syncingStatus.lastBlockWallet,
    syncingStatus.processEndBlock,
    wallet.birthday,
  ]);

  //console.log('render sync report - 5', syncingStatus);

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header
        title={translate('report.title') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
      />

      <ScrollView
        testID="syncreport.scroll-view"
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        {(!netInfo.isConnected || netInfo.type === NetInfoStateType.cellular || netInfo.isConnectionExpensive) && (
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              marginHorizontal: 20,
            }}>
            <DetailLine label={translate('report.networkstatus') as string}>
              <View style={{ display: 'flex', flexDirection: 'column' }}>
                {!netInfo.isConnected && <RegText color="red"> {translate('report.nointernet') as string} </RegText>}
                {netInfo.type === NetInfoStateType.cellular && (
                  <RegText color="yellow"> {translate('report.cellulardata') as string} </RegText>
                )}
                {netInfo.isConnectionExpensive && (
                  <RegText color="yellow"> {translate('report.connectionexpensive') as string} </RegText>
                )}
              </View>
            </DetailLine>
            <FontAwesomeIcon
              icon={faCloudDownload}
              color={!netInfo.isConnected ? 'red' : 'yellow'}
              size={20}
              style={{ marginBottom: 5, marginLeft: 5 }}
            />
          </View>
        )}
        {(Number(background.date) > 0 || Number(background.dateEnd) > 0 || !!background.message) &&
          showBackgroundLegend && (
            <View
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                marginHorizontal: 20,
              }}>
              <DetailLine
                label={translate('report.lastbackgroundsync') as string}
                value={
                  //background.batches.toString() +
                  //translate('report.batches-date') +
                  moment(Number(Number(background.date).toFixed(0)) * 1000).format('YYYY MMM D h:mm a') +
                  (Number(background.dateEnd) > 0
                    ? ' - ' + moment(Number(Number(background.dateEnd).toFixed(0)) * 1000).format('YYYY MMM D h:mm a')
                    : '')
                }
              />
              {!!background.message && <RegText color={colors.text}>{background.message}</RegText>}
            </View>
          )}
        {maxBlocks && netInfo.isConnected ? (
          <>
            <View style={{ display: 'flex', marginHorizontal: 20, marginBottom: 30 }}>
              <DetailLine
                label="Sync ID"
                value={
                  syncingStatus.syncID >= 0
                    ? syncingStatus.syncID +
                      ' - (' +
                      (syncingStatus.inProgress
                        ? (translate('report.running') as string)
                        : syncingStatus.lastBlockServer === syncingStatus.lastBlockWallet
                        ? (translate('report.finished') as string)
                        : (translate('report.paused') as string)) +
                      ')'
                    : (translate('connectingserver') as string)
                }
              />
              {!!syncingStatus.lastError && (
                <>
                  <View style={{ height: 2, width: '100%', backgroundColor: 'red', marginTop: 10 }} />
                  <DetailLine label="Last Error" value={syncingStatus.lastError} />
                  <View style={{ height: 2, width: '100%', backgroundColor: 'red', marginBottom: 10 }} />
                </>
              )}

              <View style={{ height: 2, width: '100%', backgroundColor: 'white', marginTop: 15, marginBottom: 10 }} />

              {!!maxBlocks && serverServer > 0 && serverWallet > 0 && (
                <>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: '100%',
                      justifyContent: 'space-between',
                      marginTop: 10,
                    }}>
                    {labels.map((label: string) => (
                      <Text key={label} style={{ color: colors.primary }}>
                        {label}
                      </Text>
                    ))}
                  </View>
                  <View style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
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
                    }}>
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
                      }}>
                      <Text style={{ color: colors.primary }}>{translate('report.server-title') as string}</Text>
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
                        {serverServer + (translate('report.blocks') as string)}
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
                      }}>
                      <Text style={{ color: colors.primary }}>{translate('report.wallet') as string}</Text>
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
                      <Text style={{ color: colors.text }}>
                        {serverWallet + (translate('report.blocks') as string)}
                      </Text>
                    </View>
                  )}

                  <View
                    style={{ height: 1, width: '100%', backgroundColor: 'white', marginTop: 15, marginBottom: 10 }}
                  />
                </>
              )}

              {!!maxBlocks && syncingStatus.syncID >= 0 && (
                <>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      width: '100%',
                      justifyContent: 'space-between',
                      marginTop: 10,
                    }}>
                    <>
                      <Text style={{ color: colors.primary }}>
                        {processEndBlockFixed >= wallet.birthday ? wallet.birthday : processEndBlockFixed}
                      </Text>
                      <Text style={{ color: colors.primary }}>{syncingStatus.lastBlockServer}</Text>
                    </>
                  </View>
                  <View
                    style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
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
                      borderBottomColor: colors.primary,
                      borderBottomWidth: 2,
                      marginBottom: 0,
                    }}>
                    {walletOldSyncedPercent >= 0 && (
                      <View
                        style={{
                          height: 10,
                          width: `${walletOldSyncedPercent}%`,
                          backgroundColor: 'lightyellow',
                          borderLeftColor: colors.primary,
                          borderLeftWidth: 1,
                          borderRightColor: walletOldSyncedPercent === 100 ? colors.primary : 'lightyellow',
                          borderRightWidth: walletOldSyncedPercent > 0 ? 1 : 0,
                        }}
                      />
                    )}
                    {walletNewSyncedPercent >= 0 && (
                      <View
                        style={{
                          height: 10,
                          width: `${walletNewSyncedPercent}%`,
                          backgroundColor: 'orange',
                          borderRightColor: 'orange',
                          borderRightWidth: walletNewSyncedPercent > 0 ? 1 : 0,
                        }}
                      />
                    )}
                    {walletForSyncedPercent >= 0 && (
                      <View
                        style={{
                          height: 10,
                          backgroundColor: '#333333',
                          borderRightColor: colors.primary,
                          borderRightWidth: 1,
                          width: `${walletForSyncedPercent}%`,
                        }}
                      />
                    )}
                  </View>
                  {wallet1 > 0 && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        marginTop: 5,
                      }}>
                      <Text style={{ color: colors.primary }}>{translate('report.syncedbefore') as string}</Text>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          width: 10,
                          height: 10,
                          justifyContent: 'flex-start',
                          backgroundColor: 'lightyellow',
                          margin: 5,
                        }}
                      />
                      <Text style={{ color: colors.text }}>
                        {wallet1 +
                          (translate('report.blocks') as string) +
                          Utils.parseNumberFloatToStringLocale(walletOldSyncedPercent, 2) +
                          '%'}
                      </Text>
                    </View>
                  )}
                  {wallet2 > 0 && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        marginTop: 5,
                      }}>
                      <Text style={{ color: colors.primary }}>{translate('report.syncednow') as string}</Text>
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
                      <Text testID="syncreport.syncednow" style={{ color: colors.text }}>
                        {wallet2 +
                          (translate('report.blocks') as string) +
                          Utils.parseNumberFloatToStringLocale(walletNewSyncedPercent, 2) +
                          '%'}
                      </Text>
                    </View>
                  )}
                  {wallet3 > 0 && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        marginTop: 5,
                      }}>
                      <Text style={{ color: colors.primary }}>{translate('report.notyetsynced') as string}</Text>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          width: 10,
                          height: 10,
                          justifyContent: 'flex-start',
                          backgroundColor: '#333333',
                          margin: 5,
                        }}
                      />
                      <Text testID="syncreport.notyetsynced" style={{ color: colors.text }}>
                        {wallet3 +
                          (translate('report.blocks') as string) +
                          Utils.parseNumberFloatToStringLocale(walletForSyncedPercent, 2) +
                          '%'}
                      </Text>
                    </View>
                  )}

                  <View style={{ height: 2, width: '100%', backgroundColor: 'white', marginTop: 15 }} />
                </>
              )}

              {syncingStatus.inProgress && syncingStatus.currentBatch > 0 && (
                <>
                  <DetailLine
                    testID="syncreport.currentbatch"
                    label={translate('report.batches') as string}
                    value={
                      (translate('report.processingbatch') as string) +
                      syncingStatus.currentBatch +
                      (translate('report.totalbatches') as string) +
                      syncingStatus.totalBatches
                    }
                  />
                  <DetailLine
                    testID="syncreport.blocksperbatch"
                    label={translate('report.blocksperbatch') as string}
                    value={syncingStatus.blocksPerBatch.toString()}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <DetailLine
                      label={translate('report.secondsperbatch') as string}
                      value={syncingStatus.secondsPerBatch.toString()}
                    />
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                </>
              )}
              {syncingStatus.inProgress && syncingStatus.currentBlock > 0 && !!syncingStatus.lastBlockServer && (
                <>
                  <View style={{ height: 2, width: '100%', backgroundColor: colors.primary, marginTop: 10 }} />
                  <DetailLine
                    label={translate('report.blocks-title') as string}
                    value={
                      (translate('report.processingblock') as string) +
                      syncingStatus.currentBlock +
                      (translate('report.totalblocks') as string) +
                      syncingStatus.lastBlockServer
                    }
                  />
                </>
              )}
            </View>
          </>
        ) : (
          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            {netInfo.isConnected && <DetailLine label="" value={translate('connectingserver') as string} />}
          </View>
        )}
      </ScrollView>

      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button type={ButtonTypeEnum.Secondary} title={translate('close') as string} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default SyncReport;
