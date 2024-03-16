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
import RPC from '../../app/rpc';
import Header from '../Header';
import { NetInfoStateType } from '@react-native-community/netinfo';
import RegText from '../Components/RegText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCloudDownload } from '@fortawesome/free-solid-svg-icons';

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
  const [server_server, setServer_server] = useState<number>(0);
  const [server_wallet, setServer_wallet] = useState<number>(0);
  const [server_1_percent, setServer_1_percent] = useState<number>(0);
  const [server_2_percent, setServer_2_percent] = useState<number>(0);
  const [server_3_percent, setServer_3_percent] = useState<number>(0);
  const [process_end_block_fixed, setProcess_end_block_fixed] = useState<number>(0);
  const [wallet_old_synced_percent, setWallet_old_synced_percent] = useState<number>(0);
  const [wallet_new_synced_percent, setWallet_new_synced_percent] = useState<number>(0);
  const [wallet_for_synced_percent, setWallet_for_synced_percent] = useState<number>(0);
  const [wallet_1, setWallet_1] = useState<number>(0);
  const [wallet_2, setWallet_2] = useState<number>(0);
  const [wallet_3, setWallet_3] = useState<number>(0);

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

  useEffect(() => {
    (async () => await RPC.rpc_setInterruptSyncAfterBatch('false'))();
    setTimeout(() => setShowBackgroundLegend(false), 10000); // 10 seconds only
  }, []);

  useEffect(() => {
    // ref: https://github.com/zingolabs/zingo-mobile/issues/327
    // I have to subtract 1 here, almost always.
    // when end block process & last block wallet are equal, don't subtract anything.
    // when end block process & wallet birthday are equal, don't subtract anything.
    let process_end_block_fi = 0;
    if (
      syncingStatus.process_end_block &&
      syncingStatus.process_end_block !== wallet.birthday &&
      syncingStatus.process_end_block < syncingStatus.lastBlockWallet
    ) {
      process_end_block_fi = syncingStatus.process_end_block - 1;
    } else {
      process_end_block_fi = syncingStatus.process_end_block;
    }

    /*
    SERVER points:
    - server_0 : first block of the server -> 0
    - server_1 : wallet's birthday
    - server_2 : server last block
    - server_3 : empty part of the server bar
    */

    const serv_1: number = wallet.birthday || 0;
    const serv_2: number =
      syncingStatus.lastBlockServer && wallet.birthday ? syncingStatus.lastBlockServer - wallet.birthday : 0;
    const serv_3: number = maxBlocks ? maxBlocks - serv_1 - serv_2 : 0;
    const serv_1_percent: number = (serv_1 * 100) / maxBlocks;
    const serv_2_percent: number = (serv_2 * 100) / maxBlocks;
    const serv_3_percent: number = (serv_3 * 100) / maxBlocks;

    /*
      server_server : blocks of the server
      server_wallet : blocks of the wallet
    */

    const serv_server: number = syncingStatus.lastBlockServer || 0;
    const serv_wallet: number =
      syncingStatus.lastBlockServer && wallet.birthday ? syncingStatus.lastBlockServer - wallet.birthday : 0;

    /*
      WALLET points:
      - wallet_0 : birthday of the wallet
      - wallet_1 : first block of the sync process (end_block)
      - wallet_2 : current block of the sync process
      - wallet_3 : empty part of the wallet bar

      EDGE case: sometimes when you restore from seed & you don't remember the
      birthday the sync process have to start from 419200... so your wallet have
      this birthday. But sometimes in some point of the sync process the server can
      give you the real birthday... so the process start point is older than the
      birthday, even if it seems wrong/weird, this screen show the right info.
    */

    let wall_1: number =
      process_end_block_fi && wallet.birthday
        ? process_end_block_fi >= wallet.birthday
          ? process_end_block_fi - wallet.birthday
          : process_end_block_fi
        : 0;
    let wall_2: number =
      syncingStatus.currentBlock && process_end_block_fi ? syncingStatus.currentBlock - process_end_block_fi : 0;

    // It is really weird, but don't want any negative values in the UI.
    if (wall_1 < 0) {
      wall_1 = 0;
    }
    if (wall_2 < 0) {
      wall_2 = 0;
    }

    const wall_3: number =
      syncingStatus.lastBlockServer && wallet.birthday
        ? process_end_block_fi >= wallet.birthday
          ? syncingStatus.lastBlockServer - wallet.birthday - wall_1 - wall_2
          : syncingStatus.lastBlockServer - process_end_block_fi - wall_1 - wall_2
        : 0;

    let wallet_old_synced_per: number = (wall_1 * 100) / serv_wallet;
    let wallet_new_synced_per: number = (wall_2 * 100) / serv_wallet;
    if (wallet_old_synced_per < 0.01 && wallet_old_synced_per > 0) {
      wallet_old_synced_per = 0.01;
    }
    if (wallet_old_synced_per > 100) {
      wallet_old_synced_per = 100;
    }
    if (wallet_new_synced_per < 0.01 && wallet_new_synced_per > 0) {
      wallet_new_synced_per = 0.01;
    }
    if (wallet_new_synced_per > 100) {
      wallet_new_synced_per = 100;
    }
    const wallet_for_synced_per: number = 100 - wallet_old_synced_per - wallet_new_synced_per;

    setServer_server(serv_server);
    setServer_wallet(serv_wallet);
    setServer_1_percent(serv_1_percent);
    setServer_2_percent(serv_2_percent);
    setServer_3_percent(serv_3_percent);
    setProcess_end_block_fixed(process_end_block_fi);
    setWallet_old_synced_percent(wallet_old_synced_per);
    setWallet_new_synced_percent(wallet_new_synced_per);
    setWallet_for_synced_percent(wallet_for_synced_per);
    setWallet_1(wall_1);
    setWallet_2(wall_2);
    setWallet_3(wall_3);
  }, [
    maxBlocks,
    syncingStatus.currentBlock,
    syncingStatus.lastBlockServer,
    syncingStatus.lastBlockWallet,
    syncingStatus.process_end_block,
    wallet.birthday,
  ]);

  //console.log(
  //  'birthday',
  //  wallet.birthday,
  //  'end',
  //  syncingStatus.process_end_block,
  //  'end fixed',
  //  process_end_block_fixed,
  //  'last wallet',
  //  syncingStatus.lastBlockWallet,
  //  'last server',
  //  syncingStatus.lastBlockServer,
  //);
  //console.log('wallet', wallet_1, wallet_2, wallet_3);
  //console.log('server', server_1, server_2, server_3);
  //console.log('leyends', server_server, server_wallet, server_sync);
  //console.log('wallet', wallet_old_synced, wallet_new_synced, wallet_for_synced);
  //console.log('wallet %', wallet_old_synced_percent, wallet_new_synced_percent, wallet_for_synced_percent);
  //console.log(maxBlocks, labels, points);
  //console.log('report', background.batches, background.date, Number(background.date).toFixed(0));

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

              {!!maxBlocks && server_server > 0 && server_wallet > 0 && (
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
                          width: ((points[1] * 100) / maxBlocks).toString() + '%',
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
                    {server_1_percent >= 0 && (
                      <View
                        style={{
                          height: 10,
                          backgroundColor: 'blue',
                          borderLeftColor: colors.primary,
                          borderLeftWidth: 1,
                          borderRightColor: 'blue',
                          borderRightWidth: server_1_percent > 0 ? 1 : 0,
                          width: server_1_percent.toString() + '%',
                        }}
                      />
                    )}
                    {server_2_percent >= 0 && (
                      <View
                        style={{
                          height: 10,
                          backgroundColor: 'yellow',
                          borderRightColor: 'yellow',
                          borderRightWidth: server_2_percent > 0 ? 1 : 0,
                          width: server_2_percent.toString() + '%',
                          borderBottomColor: 'blue',
                          borderBottomWidth: 5,
                        }}
                      />
                    )}
                    {server_3_percent >= 0 && (
                      <View
                        style={{
                          height: 10,
                          backgroundColor: '#333333',
                          borderRightColor: colors.primary,
                          borderRightWidth: 1,
                          width: server_3_percent.toString() + '%',
                        }}
                      />
                    )}
                  </View>
                  {server_server > 0 && (
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
                        {server_server + (translate('report.blocks') as string)}
                      </Text>
                    </View>
                  )}
                  {server_wallet > 0 && (
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
                        {server_wallet + (translate('report.blocks') as string)}
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
                        {process_end_block_fixed >= wallet.birthday ? wallet.birthday : process_end_block_fixed}
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
                    {wallet_old_synced_percent >= 0 && (
                      <View
                        style={{
                          height: 10,
                          width: wallet_old_synced_percent.toString() + '%',
                          backgroundColor: 'lightyellow',
                          borderLeftColor: colors.primary,
                          borderLeftWidth: 1,
                          borderRightColor: wallet_old_synced_percent === 100 ? colors.primary : 'lightyellow',
                          borderRightWidth: wallet_old_synced_percent > 0 ? 1 : 0,
                        }}
                      />
                    )}
                    {wallet_new_synced_percent >= 0 && (
                      <View
                        style={{
                          height: 10,
                          width: wallet_new_synced_percent.toString() + '%',
                          backgroundColor: 'orange',
                          borderRightColor: 'orange',
                          borderRightWidth: wallet_new_synced_percent > 0 ? 1 : 0,
                        }}
                      />
                    )}
                    {wallet_for_synced_percent >= 0 && (
                      <View
                        style={{
                          height: 10,
                          backgroundColor: '#333333',
                          borderRightColor: colors.primary,
                          borderRightWidth: 1,
                          width: wallet_for_synced_percent.toString() + '%',
                        }}
                      />
                    )}
                  </View>
                  {wallet_1 > 0 && (
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
                        {wallet_1 + (translate('report.blocks') as string) + wallet_old_synced_percent.toFixed(2) + '%'}
                      </Text>
                    </View>
                  )}
                  {wallet_2 > 0 && (
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
                        {wallet_2 + (translate('report.blocks') as string) + wallet_new_synced_percent.toFixed(2) + '%'}
                      </Text>
                    </View>
                  )}
                  {wallet_3 > 0 && (
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
                        {wallet_3 + (translate('report.blocks') as string) + wallet_for_synced_percent.toFixed(2) + '%'}
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
        <Button type="Secondary" title={translate('close') as string} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default SyncReport;
