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
  const { syncingStatusReport, walletSeed, translate, background, language, netInfo } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [maxBlocks, setMaxBlocks] = useState(0);
  const [points, setPoints] = useState([] as number[]);
  const [labels, setLabels] = useState([] as string[]);
  moment.locale(language);

  useEffect(() => {
    if (syncingStatusReport.lastBlockServer) {
      (async () => {
        const a = [0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000, 3500000, 4000000, 4500000, 5000000];
        const l = ['0', '500K', '1M', '1.5M', '2M', '2.5M', '3M', '3.5M', '4M', '4.5M', '5M'];
        for (let i = 0; i < a.length; i++) {
          if (syncingStatusReport.lastBlockServer < a[i]) {
            setMaxBlocks(a[i]);
            setPoints(a.slice(0, i));
            setLabels(l.slice(0, i + 1));
            break;
          }
        }
      })();
    }
  }, [syncingStatusReport.lastBlockServer]);

  useEffect(() => {
    (async () => await RPC.rpc_setInterruptSyncAfterBatch('false'))();
  }, []);

  /*
    SERVER points:
    - server_0 : first block of the server -> 0
    - server_1 : wallet's birthday
    - server_2 : server last block
    - server_3 : empty part of the server bar
  */

  const server_1: number = walletSeed.birthday || 0;
  const server_2: number =
    syncingStatusReport.lastBlockServer && walletSeed.birthday
      ? syncingStatusReport.lastBlockServer - walletSeed.birthday || 0
      : 0;
  const server_3: number = maxBlocks ? maxBlocks - server_1 - server_2 : 0;
  const server_1_percent: number = (server_1 * 100) / maxBlocks;
  const server_2_percent: number = (server_2 * 100) / maxBlocks;
  const server_3_percent: number = (server_3 * 100) / maxBlocks;

  /*
    server_server : blocks of the server
    server_wallet : blocks of the wallet
  */

  const server_server: number = syncingStatusReport.lastBlockServer || 0;
  const server_wallet: number =
    syncingStatusReport.lastBlockServer && walletSeed.birthday
      ? syncingStatusReport.lastBlockServer - walletSeed.birthday || 0
      : 0;

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

  let wallet_1: number =
    syncingStatusReport.process_end_block && walletSeed.birthday
      ? syncingStatusReport.process_end_block >= walletSeed.birthday
        ? syncingStatusReport.process_end_block - walletSeed.birthday || 0
        : syncingStatusReport.process_end_block
      : 0;
  let wallet_2: number =
    syncingStatusReport.currentBlock && syncingStatusReport.process_end_block
      ? syncingStatusReport.currentBlock - syncingStatusReport.process_end_block || 0
      : 0;

  // It is really weird, but don't want any negative values in the UI.
  if (wallet_1 < 0) {
    wallet_1 = 0;
  }
  if (wallet_2 < 0) {
    wallet_2 = 0;
  }

  const wallet_3: number =
    syncingStatusReport.lastBlockServer && walletSeed.birthday
      ? syncingStatusReport.process_end_block >= walletSeed.birthday
        ? syncingStatusReport.lastBlockServer - walletSeed.birthday - wallet_1 - wallet_2 || 0
        : syncingStatusReport.lastBlockServer - syncingStatusReport.process_end_block - wallet_1 - wallet_2 || 0
      : 0;

  let wallet_old_synced_percent: number = (wallet_1 * 100) / server_wallet;
  let wallet_new_synced_percent: number = (wallet_2 * 100) / server_wallet;
  if (wallet_old_synced_percent < 0.01 && wallet_old_synced_percent > 0) {
    wallet_old_synced_percent = 0.01;
  }
  if (wallet_old_synced_percent > 100) {
    wallet_old_synced_percent = 100;
  }
  if (wallet_new_synced_percent < 0.01 && wallet_new_synced_percent > 0) {
    wallet_new_synced_percent = 0.01;
  }
  if (wallet_new_synced_percent > 100) {
    wallet_new_synced_percent = 100;
  }
  const wallet_for_synced_percent: number = 100 - wallet_old_synced_percent - wallet_new_synced_percent;

  //console.log(
  //  syncingStatusReport,
  //  walletSeed.birthday,
  //  syncingStatusReport.process_end_block,
  //  syncingStatusReport.lastBlockWallet,
  //  syncingStatusReport.lastBlockServer,
  //);
  //console.log('server', server_1, server_2, server_3);
  //console.log('leyends', server_server, server_wallet, server_sync);
  //console.log('wallet', wallet_old_synced, wallet_new_synced, wallet_for_synced);
  //console.log('wallet %', wallet_old_synced_percent, wallet_new_synced_percent, wallet_for_synced_percent);
  //console.log(maxBlocks, labels, points);
  //console.log('report', background.batches, background.date, Number(background.date).toFixed(0));

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header title={translate('report.title') as string} noBalance={true} noSyncingStatus={true} noDrawMenu={true} />

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
        {background.batches > 0 && background.date > 0 && (
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              margin: 20,
            }}>
            <DetailLine
              label={translate('report.lastbackgroundsync') as string}
              value={
                background.batches.toString() +
                translate('report.batches-date') +
                moment(Number(Number(background.date).toFixed(0)) * 1000).format('YYYY MMM D h:mm a')
              }
            />
          </View>
        )}
        {maxBlocks && netInfo.isConnected ? (
          <>
            <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
              <DetailLine
                label="Sync ID"
                value={
                  syncingStatusReport.syncID && syncingStatusReport.syncID >= 0
                    ? syncingStatusReport.syncID +
                      ' - (' +
                      (syncingStatusReport.inProgress
                        ? (translate('report.running') as string)
                        : (translate('report.finished') as string)) +
                      ')'
                    : (translate('connectingserver') as string)
                }
              />
              {!!syncingStatusReport.lastError && (
                <>
                  <View style={{ height: 2, width: '100%', backgroundColor: 'red', marginTop: 10 }} />
                  <DetailLine label="Last Error" value={syncingStatusReport.lastError} />
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

              {!!maxBlocks && !!syncingStatusReport.syncID && syncingStatusReport.syncID >= 0 && (
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
                        {syncingStatusReport.process_end_block >= walletSeed.birthday
                          ? walletSeed.birthday
                          : syncingStatusReport.process_end_block}
                      </Text>
                      <Text style={{ color: colors.primary }}>{syncingStatusReport.lastBlockServer}</Text>
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
                          borderRightColor: 'lightyellow',
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

              {syncingStatusReport.inProgress && syncingStatusReport.currentBatch > 0 && (
                <>
                  <DetailLine
                    testID="syncreport.currentbatch"
                    label={translate('report.batches') as string}
                    value={
                      (translate('report.processingbatch') as string) +
                      syncingStatusReport.currentBatch +
                      (translate('report.totalbatches') as string) +
                      syncingStatusReport.totalBatches
                    }
                  />
                  <DetailLine
                    testID="syncreport.blocksperbatch"
                    label={translate('report.blocksperbatch') as string}
                    value={syncingStatusReport.blocksPerBatch.toString()}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <DetailLine
                      label={translate('report.secondsperbatch') as string}
                      value={syncingStatusReport.secondsPerBatch.toString()}
                    />
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                </>
              )}
              {syncingStatusReport.inProgress &&
                syncingStatusReport.currentBlock > 0 &&
                !!syncingStatusReport.lastBlockServer && (
                  <>
                    <View style={{ height: 2, width: '100%', backgroundColor: colors.primary, marginTop: 10 }} />
                    <DetailLine
                      label={translate('report.blocks-title') as string}
                      value={
                        (translate('report.processingblock') as string) +
                        syncingStatusReport.currentBlock +
                        (translate('report.totalblocks') as string) +
                        syncingStatusReport.lastBlockServer
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
