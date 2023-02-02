/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView, Image, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../../app/types';
import RegText from '../Components/RegText';
import Button from '../Button';
import DetailLine from './components/DetailLine';
import { ContextLoaded } from '../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import RPC from '../../app/rpc';

type SyncReportProps = {
  closeModal: () => void;
};

const SyncReport: React.FunctionComponent<SyncReportProps> = ({ closeModal }) => {
  const context = useContext(ContextLoaded);
  const { syncingStatusReport, walletSeed, translate, background, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [maxBlocks, setMaxBlocks] = useState(0);
  const [points, setPoints] = useState([] as number[]);
  const [labels, setLabels] = useState([] as string[]);
  const [birthday_plus_1, setBirthday_plus_1] = useState(0);
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
    setBirthday_plus_1((walletSeed.birthday || 0) + 1);
  }, [walletSeed.birthday]);

  useEffect(() => {
    (async () => await RPC.rpc_setInterruptSyncAfterBatch('false'))();
  }, []);

  const server_1: number = birthday_plus_1 || 0;
  const server_2: number =
    syncingStatusReport.process_end_block && birthday_plus_1
      ? syncingStatusReport.process_end_block - birthday_plus_1 || 0
      : syncingStatusReport.lastBlockWallet && birthday_plus_1
      ? syncingStatusReport.lastBlockWallet - birthday_plus_1 || 0
      : 0;
  const server_3: number =
    syncingStatusReport.lastBlockServer && syncingStatusReport.process_end_block
      ? syncingStatusReport.lastBlockServer - syncingStatusReport.process_end_block || 0
      : syncingStatusReport.lastBlockServer && syncingStatusReport.lastBlockWallet
      ? syncingStatusReport.lastBlockServer - syncingStatusReport.lastBlockWallet || 0
      : 0;
  const server_4: number = maxBlocks ? maxBlocks - server_1 - server_2 - server_3 || 0 : 0;
  const server_server: number = syncingStatusReport.lastBlockServer || 0;
  const server_wallet: number =
    syncingStatusReport.lastBlockServer && birthday_plus_1
      ? syncingStatusReport.lastBlockServer - birthday_plus_1 || 0
      : 0;

  let wallet_1: number =
    syncingStatusReport.process_end_block && birthday_plus_1
      ? syncingStatusReport.process_end_block - birthday_plus_1 || 0
      : syncingStatusReport.lastBlockWallet && birthday_plus_1
      ? syncingStatusReport.lastBlockWallet - birthday_plus_1 || 0
      : 0;
  let wallet_21: number =
    syncingStatusReport.currentBlock && syncingStatusReport.process_end_block
      ? syncingStatusReport.currentBlock - syncingStatusReport.process_end_block || 0
      : syncingStatusReport.currentBlock && syncingStatusReport.lastBlockWallet
      ? syncingStatusReport.currentBlock - syncingStatusReport.lastBlockWallet || 0
      : 0;
  // It is really weird, but don't want any negative values in the UI.
  if (wallet_1 < 0) {
    wallet_1 = 0;
  }
  if (wallet_21 < 0) {
    wallet_21 = 0;
  }
  const wallet_3: number =
    syncingStatusReport.lastBlockServer && birthday_plus_1
      ? syncingStatusReport.lastBlockServer - birthday_plus_1 - wallet_1 - wallet_21 || 0
      : 0;
  let wallet_old_synced: number = wallet_1;
  let wallet_new_synced: number = wallet_21;
  let wallet_for_synced: number = wallet_3;

  let wallet_old_synced_percent: number = (wallet_old_synced * 100) / server_wallet;
  let wallet_new_synced_percent: number = (wallet_new_synced * 100) / server_wallet;
  if (wallet_new_synced_percent < 0.01 && wallet_new_synced_percent > 0) {
    wallet_new_synced_percent = 0.01;
  }
  if (wallet_old_synced_percent > 100) {
    wallet_old_synced_percent = 100;
  }
  if (wallet_new_synced_percent > 100) {
    wallet_new_synced_percent = 100;
  }
  const wallet_for_synced_percent: number = 100 - wallet_old_synced_percent - wallet_new_synced_percent;

  //console.log(
  //  syncStatusReport,
  //  birthday_plus_1,
  //  syncStatusReport.process_end_block,
  //  syncStatusReport.lastBlockWallet,
  //  syncStatusReport.lastBlockServer,
  //);
  //console.log('server', server_1, server_2, server_3, server_4);
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
      <View
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingBottom: 10,
          backgroundColor: colors.card,
          zIndex: -1,
          paddingTop: 10,
        }}>
        <Image
          source={require('../../assets/img/logobig-zingo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain' }}
        />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          {translate('report.title')}
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </View>

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        {maxBlocks ? (
          <>
            <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
              {background.batches > 0 && background.date > 0 && (
                <DetailLine
                  label={translate('report.lastbackgroundsync')}
                  value={
                    background.batches.toString() +
                    translate('report.batches-date') +
                    moment(Number(Number(background.date).toFixed(0)) * 1000).format('YYYY MMM D h:mm a')
                  }
                />
              )}
              <DetailLine
                label="Sync ID"
                value={
                  syncingStatusReport.syncID && syncingStatusReport.syncID >= 0
                    ? syncingStatusReport.syncID +
                      ' - (' +
                      (syncingStatusReport.inProgress ? translate('report.running') : translate('report.finished')) +
                      ')'
                    : translate('loading')
                }
              />
              {!!syncingStatusReport.lastError && (
                <>
                  <View style={{ height: 2, width: '100%', backgroundColor: 'red', marginTop: 10 }} />
                  <DetailLine label="Last Error" value={syncingStatusReport.lastError} />
                  <View style={{ height: 2, width: '100%', backgroundColor: 'red', marginBottom: 10 }} />
                </>
              )}
              {/*!!syncStatusReport.message && (
                <>
                  <View style={{ height: 2, width: '100%', backgroundColor: colors.primary, marginTop: 10 }}></View>
                  <DetailLine
                    label="Info about the syncing"
                    value={syncStatusReport.message}
                  />
                </>
              )*/}

              <View style={{ height: 2, width: '100%', backgroundColor: 'white', marginTop: 15, marginBottom: 10 }} />

              {!!maxBlocks && (
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
                    {server_1 >= 0 && (
                      <View
                        style={{
                          height: 10,
                          backgroundColor: 'blue',
                          borderLeftColor: colors.primary,
                          borderLeftWidth: 1,
                          borderRightColor: 'blue',
                          borderRightWidth: server_1 > 0 ? 1 : 0,
                          width: ((server_1 * 100) / maxBlocks).toString() + '%',
                        }}
                      />
                    )}
                    {server_2 + server_3 >= 0 && (
                      <View
                        style={{
                          height: 10,
                          backgroundColor: 'yellow',
                          borderRightColor: 'yellow',
                          borderRightWidth: server_2 + server_3 > 0 ? 1 : 0,
                          width: (((server_2 + server_3) * 100) / maxBlocks).toString() + '%',
                          borderBottomColor: 'blue',
                          borderBottomWidth: 5,
                        }}
                      />
                    )}
                    {server_4 >= 0 && (
                      <View
                        style={{
                          height: 10,
                          backgroundColor: 'transparent',
                          borderRightColor: colors.primary,
                          borderRightWidth: 1,
                          width: ((server_4 * 100) / maxBlocks).toString() + '%',
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
                      <Text style={{ color: colors.primary }}>{translate('report.server-title')}</Text>
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
                      <Text style={{ color: colors.text }}>{server_server + translate('report.blocks')}</Text>
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
                      <Text style={{ color: colors.primary }}>{translate('report.wallet')}</Text>
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
                      <Text style={{ color: colors.text }}>{server_wallet + translate('report.blocks')}</Text>
                    </View>
                  )}
                </>
              )}

              <View style={{ height: 1, width: '100%', backgroundColor: 'white', marginTop: 15, marginBottom: 10 }} />

              {!!maxBlocks && (
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
                      <Text style={{ color: colors.primary }}>{birthday_plus_1}</Text>
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
                    {wallet_1 >= 0 && (
                      <View
                        style={{
                          height: 10,
                          width:
                            ((wallet_1 * 100) / (syncingStatusReport.lastBlockServer - birthday_plus_1)).toString() +
                            '%',
                          backgroundColor: 'lightyellow',
                          borderLeftColor: colors.primary,
                          borderLeftWidth: 1,
                          borderRightColor: 'lightyellow',
                          borderRightWidth: wallet_1 > 0 ? 1 : 0,
                        }}
                      />
                    )}
                    {wallet_21 >= 0 && (
                      <View
                        style={{
                          height: 10,
                          width:
                            ((wallet_21 * 100) / (syncingStatusReport.lastBlockServer - birthday_plus_1)).toString() +
                            '%',
                          backgroundColor: 'orange',
                          borderRightColor: 'orange',
                          borderRightWidth: wallet_21 > 0 ? 1 : 0,
                        }}
                      />
                    )}
                    {wallet_3 >= 0 && (
                      <View
                        style={{
                          height: 10,
                          backgroundColor: '#333333',
                          borderRightColor: colors.primary,
                          borderRightWidth: 1,
                          width:
                            ((wallet_3 * 100) / (syncingStatusReport.lastBlockServer - birthday_plus_1)).toString() +
                            '%',
                        }}
                      />
                    )}
                  </View>
                  {wallet_old_synced > 0 && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        marginTop: 5,
                      }}>
                      <Text style={{ color: colors.primary }}>{translate('report.syncedbefore')}</Text>
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
                        {wallet_old_synced + translate('report.blocks') + wallet_old_synced_percent.toFixed(2) + '%'}
                      </Text>
                    </View>
                  )}
                  {wallet_new_synced > 0 && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        marginTop: 5,
                      }}>
                      <Text style={{ color: colors.primary }}>{translate('report.syncednow')}</Text>
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
                      <Text style={{ color: colors.text }}>
                        {wallet_new_synced + translate('report.blocks') + wallet_new_synced_percent.toFixed(2) + '%'}
                      </Text>
                    </View>
                  )}
                  {wallet_for_synced > 0 && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        marginTop: 5,
                      }}>
                      <Text style={{ color: colors.primary }}>{translate('report.notyetsynced')}</Text>
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
                      <Text style={{ color: colors.text }}>
                        {wallet_for_synced + translate('report.blocks') + wallet_for_synced_percent.toFixed(2) + '%'}
                      </Text>
                    </View>
                  )}
                </>
              )}

              <View style={{ height: 2, width: '100%', backgroundColor: 'white', marginTop: 15 }} />

              {syncingStatusReport.inProgress && syncingStatusReport.currentBatch > 0 && (
                <>
                  <DetailLine
                    label={translate('report.batches')}
                    value={
                      translate('report.processingbatch') +
                      syncingStatusReport.currentBatch +
                      translate('report.totalbatches') +
                      syncingStatusReport.totalBatches
                    }
                  />
                  <DetailLine
                    label={translate('report.blocksperbatch')}
                    value={syncingStatusReport.blocksPerBatch.toString()}
                  />
                  <DetailLine
                    label={translate('report.secondsperbatch')}
                    value={syncingStatusReport.secondsPerBatch.toString()}
                  />
                </>
              )}
              {syncingStatusReport.inProgress &&
                syncingStatusReport.currentBlock > 0 &&
                !!syncingStatusReport.lastBlockServer && (
                  <>
                    <View style={{ height: 2, width: '100%', backgroundColor: colors.primary, marginTop: 10 }} />
                    <DetailLine
                      label={translate('report.blocks-title')}
                      value={
                        translate('report.processingblock') +
                        syncingStatusReport.currentBlock +
                        translate('report.totalblocks') +
                        syncingStatusReport.lastBlockServer
                      }
                    />
                  </>
                )}
            </View>
          </>
        ) : (
          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <DetailLine label="" value={translate('loading')} />
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
        <Button type="Secondary" title={translate('close')} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default SyncReport;
