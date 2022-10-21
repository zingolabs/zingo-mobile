/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {View, ScrollView, SafeAreaView, Image, Text} from 'react-native';
import {RegText, FadeText, ZecAmount, UsdAmount} from './Components';
import Button from './Button';
import {useTheme} from '@react-navigation/native';
import {TotalBalance, SyncStatusReport} from '../app/AppState';
import Utils from '../app/utils';
import RPC from '../app/rpc'

type DetailLineProps = {
  label: string;
  value?: string | number;
};
const DetailLine: React.FunctionComponent<DetailLineProps> = ({label, value}) => {
  const colors = useTheme();
  return (
    <View style={{display: 'flex', marginTop: 20}}>
      <FadeText>{label}</FadeText>
      <RegText color={colors.text}>{value}</RegText>
    </View>
  );
};

type SyncReportModalProps = {
  closeModal: () => void;
  totalBalance: object;
  currencyName: string;
  syncStatusReport: SyncStatusReport;
  birthday_plus_1?: number;
};

const SyncReportModal: React.FunctionComponent<SyncReportModalProps> = ({closeModal, totalBalance, currencyName, syncStatusReport, birthday}) => {
  const {colors} = useTheme();
  const [maxBlocks, setMaxBlocks] = useState(null);
  const [points, setPoints] = useState([]);
  const [index, setIndex] = useState(null);
  const [birthday_plus_1, setBirthday_plus_1] = useState((birthday || 0) + 1);
  const labels = ['0', '500K', '1M', '1.5M', '2M', '2.5M', '3M', '3.5M', '4M', '4.5M', '5M'];

  React.useEffect(() => {
    (async () => {

      const a = [0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000, 3500000, 4000000, 4500000, 5000000];
      for (let i = 0; i < a.length; i++) {
        if (syncStatusReport.lastBlockServer < a[i]) {
          setMaxBlocks(a[i]);
          setPoints(a.slice(0, i + 1));
          setIndex(i);
          break;
        }
      }

    })();
  }, [syncStatusReport.lastBlockServer])

  const server_1: number = birthday_plus_1 || 0;
  const server_2: number = syncStatusReport.process_end_block && birthday_plus_1
    ? (syncStatusReport.process_end_block - birthday_plus_1) || 0
    : syncStatusReport.lastBlockWallet && birthday_plus_1
      ? (syncStatusReport.lastBlockWallet - birthday_plus_1) || 0
      : 0;
  const server_3: number = syncStatusReport.lastBlockServer && syncStatusReport.process_end_block
    ? (syncStatusReport.lastBlockServer - syncStatusReport.process_end_block) || 0
    : syncStatusReport.lastBlockServer && syncStatusReport.lastBlockWallet
      ? (syncStatusReport.lastBlockServer - syncStatusReport.lastBlockWallet) || 0
      : 0;
  const server_4: number = maxBlocks
    ? (maxBlocks - server_1 - server_2 - server_3) || 0
    : 0;
  const server_server: number = syncStatusReport.lastBlockServer || 0;
  const server_wallet: number = syncStatusReport.lastBlockServer && birthday_plus_1
    ? (syncStatusReport.lastBlockServer - birthday_plus_1) || 0
    : 0;
  const server_sync: number = syncStatusReport.lastBlockServer && syncStatusReport.process_end_block
    ? (syncStatusReport.lastBlockServer - syncStatusReport.process_end_block) || 0
    : 0;

  const wallet_1: number = syncStatusReport.process_end_block && birthday_plus_1
    ? (syncStatusReport.process_end_block - birthday_plus_1) || 0
    : syncStatusReport.lastBlockWallet && birthday_plus_1
      ? (syncStatusReport.lastBlockWallet - birthday_plus_1) || 0
      : 0;
  const wallet_21: number = syncStatusReport.currentBlock && syncStatusReport.process_end_block
    ? (syncStatusReport.currentBlock - syncStatusReport.process_end_block) || 0
    : syncStatusReport.currentBlock && syncStatusReport.lastBlockWallet
      ? (syncStatusReport.currentBlock - syncStatusReport.lastBlockWallet) || 0
      : 0;
  const wallet_3: number = syncStatusReport.lastBlockServer && birthday_plus_1
    ? ((syncStatusReport.lastBlockServer - birthday_plus_1) - wallet_1 - wallet_21) || 0
    : 0;
  let wallet_old_synced: number = wallet_1;
  let wallet_new_synced: number = wallet_21;
  let wallet_for_synced: number = wallet_3;

  // It is really weird, Don't want any negative values in the UI.
  if (wallet_old_synced < 0) {
    wallet_old_synced = 0;
  }

  const wallet_old_synced_percent: number = (wallet_old_synced * 100) / server_wallet;
  let wallet_new_synced_percent: number = (wallet_new_synced * 100) / server_wallet;
  if (wallet_new_synced_percent < 0.01 && wallet_new_synced_percent > 0) {
    wallet_new_synced_percent = 0.01;
  }
  const wallet_for_synced_percent: number = 100 - wallet_old_synced_percent - wallet_new_synced_percent;

  //console.log(syncStatusReport, birthday, birthday_plus_1);
  //console.log('server', server_1, server_2, server_3, server_4);
  //console.log('leyends', server_server, server_wallet, server_sync);
  //console.log('wallet', wallet_old_synced, wallet_new_synced, wallet_for_synced);
  //console.log('wallet %', wallet_old_synced_percent, wallet_new_synced_percent, wallet_for_synced_percent);

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
        style={{display: 'flex', alignItems: 'center', paddingBottom: 10, backgroundColor: colors.card, zIndex: -1, paddingTop: 10}}>
        <Image source={require('../assets/img/logobig-zingo.png')} style={{width: 80, height: 80, resizeMode: 'contain'}} />
        <RegText color={colors.money} style={{marginTop: 5, padding: 5}}>Sync / Rescan Report</RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary}}></View>
      </View>

      <ScrollView
        style={{maxHeight: '85%'}}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{display: 'flex', margin: 20}}>
          <DetailLine
            label="Sync ID"
            value={!!syncStatusReport.syncID ? syncStatusReport.syncID + ' - (' + (syncStatusReport.inProgress ? 'Running' : 'Finished') + ')' : '...loading...'}
          />
          {!!syncStatusReport.lastError && (
            <>
              <View style={{ height: 2, width: '100%', backgroundColor: 'red', marginTop: 10 }}></View>
              <DetailLine
                label="Last Error"
                value={syncStatusReport.lastError}
              />
              <View style={{ height: 2, width: '100%', backgroundColor: 'red', marginBottom: 10 }}></View>
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

          <View style={{ height: 2, width: '100%', backgroundColor: 'white', marginTop: 15, marginBottom: 10 }}></View>

          {!!maxBlocks && (
            <>
              <View style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 10 }}>
                {labels.filter((e, i) => i <= index).map((label) =>
                  <Text key={label} style={{ color: colors.primary }}>{label}</Text>
                )}
              </View>
              <View style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                {points.map((point) =>
                  <View key={point} style={{ height: 10, borderRightColor: colors.primary, borderRightWidth: 1 , borderLeftColor: colors.primary, borderLeftWidth: 1, width: ((points[1] * 100) / maxBlocks).toString() + '%' }}></View>
                )}
              </View>
              <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', width: '100.3%', borderBottomColor: colors.primary, borderBottomWidth: 2, marginBottom: 0 }}>
                {server_1 > 0 && (
                  <View style={{ height: 10, backgroundColor: 'blue', borderLeftColor: colors.primary, borderLeftWidth: 1, width: ((server_1 * 100) / maxBlocks).toString() + '%' }}></View>
                )}
                {server_2 > 0 && (
                  <View style={{ height: 10, width: (((server_2 + server_3) * 100) / maxBlocks).toString() + '%', backgroundColor: 'yellow' }}></View>
                )}
                {/*server_3 > 0 && (
                  <View style={{ height: 10, width: ((server_3 * 100) / maxBlocks).toString() + '%', backgroundColor: 'green' }}></View>
                )*/}
                {server_4 > 0 && (
                  <View style={{ height: 10, backgroundColor: 'transparent', borderRightColor: colors.primary, borderRightWidth: 2, width: ((server_4 * 100) / maxBlocks).toString() + '%' }}></View>
                )}
              </View>
              {server_server > 0 && (
                <View style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'flex-start', alignItems: 'center', marginTop: 5 }}>
                  <Text style={{ color: colors.primary }}>{'SERVER : '}</Text>
                  <View style={{ display: 'flex', flexDirection: 'row', width: 10, height: 10, justifyContent: 'flex-start', backgroundColor: 'blue', margin: 5 }}></View>
                  <Text style={{ color: colors.text }}>{server_server + ' blocks'}</Text>
                </View>
              )}
              {server_wallet > 0 && (
                <View style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'flex-start', alignItems: 'center', marginTop: 5 }}>
                  <Text style={{ color: colors.primary }}>{'Wallet : '}</Text>
                  <View style={{ display: 'flex', flexDirection: 'row', width: 10, height: 10, justifyContent: 'flex-start', backgroundColor: 'yellow', margin: 5 }}></View>
                  <Text style={{ color: colors.text }}>{server_wallet + ' blocks'}</Text>
                </View>
              )}
              {/*server_sync > 0 && (
                <View style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'flex-start', alignItems: 'center', marginTop: 5 }}>
                  <Text style={{ color: colors.primary }}>{'Sync Process : '}</Text>
                  <View style={{ display: 'flex', flexDirection: 'row', width: 10, height: 10, justifyContent: 'flex-start', backgroundColor: 'green', margin: 5 }}></View>
                  <Text style={{ color: colors.text }}>{server_sync + ' blocks'}</Text>
                </View>
              )*/}
            </>
          )}

          <View style={{ height: 1, width: '100%', backgroundColor: 'white', marginTop: 15, marginBottom: 10 }}></View>

          {!!maxBlocks && (
            <>
              <View style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 10 }}>
                <>
                  <Text style={{ color: colors.primary }}>{birthday_plus_1}</Text>
                  <Text style={{ color: colors.primary }}>{syncStatusReport.lastBlockServer}</Text>
                </>
              </View>
              <View style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                <>
                  <View style={{ height: 10, borderLeftColor: colors.primary, borderLeftWidth: 1 }}></View>
                  <View style={{ height: 10, borderRightColor: colors.primary, borderRightWidth: 1 }}></View>
                </>
              </View>
              <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', width: '100%', borderBottomColor: colors.primary, borderBottomWidth: 2, marginBottom: 0 }}>
                {wallet_1 > 0 && (
                  <View style={{ height: 10, width: ((wallet_1 * 100) / (syncStatusReport.lastBlockServer - birthday_plus_1)).toString() + '%', backgroundColor: 'yellow', borderLeftColor: colors.primary, borderLeftWidth: 1 }}></View>
                )}
                {wallet_21 > 0 && (
                  <View style={{ height: 10, width: ((wallet_21 * 100) / (syncStatusReport.lastBlockServer - birthday_plus_1)).toString() + '%', backgroundColor: 'orange' }}></View>
                )}
                {wallet_3 > 0 && (
                  <View style={{ height: 10, backgroundColor: '#331100', borderRightColor: colors.primary, borderRightWidth: 1, width: ((wallet_3 * 100) / (syncStatusReport.lastBlockServer - birthday_plus_1)).toString() + '%' }}></View>
                )}
              </View>
              {wallet_old_synced > 0 && (
                <View style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'flex-start', alignItems: 'center', marginTop: 5 }}>
                  <Text style={{ color: colors.primary }}>{'Synced before : '}</Text>
                  <View style={{ display: 'flex', flexDirection: 'row', width: 10, height: 10, justifyContent: 'flex-start', backgroundColor: 'yellow', margin: 5 }}></View>
                  <Text style={{ color: colors.text }}>{wallet_old_synced + ' blocks. ' + wallet_old_synced_percent.toFixed(2) + '%'}</Text>
                </View>
              )}
              {wallet_new_synced > 0 && (
                <View style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'flex-start', alignItems: 'center', marginTop: 5 }}>
                  <Text style={{ color: colors.primary }}>{'Synced now : '}</Text>
                  <View style={{ display: 'flex', flexDirection: 'row', width: 10, height: 10, justifyContent: 'flex-start', backgroundColor: 'orange', margin: 5 }}></View>
                  <Text style={{ color: colors.text }}>{wallet_new_synced + ' blocks. ' + wallet_new_synced_percent.toFixed(2) + '%'}</Text>
                </View>
              )}
              {wallet_for_synced > 0 && (
                <View style={{ display: 'flex', flexDirection: 'row', width: '100%', justifyContent: 'flex-start', alignItems: 'center', marginTop: 5 }}>
                  <Text style={{ color: colors.primary }}>{'Not Yet Synced : '}</Text>
                  <View style={{ display: 'flex', flexDirection: 'row', width: 10, height: 10, justifyContent: 'flex-start', backgroundColor: '#331100', margin: 5 }}></View>
                  <Text style={{ color: colors.text }}>{wallet_for_synced + ' blocks. ' + wallet_for_synced_percent.toFixed(2) +'%'}</Text>
                </View>
              )}
            </>
          )}

          <View style={{ height: 2, width: '100%', backgroundColor: 'white', marginTop: 15 }}></View>

          {/*syncStatusReport.inProgress && (
            <>
              <DetailLine
                label="PERCENT"
                value={syncStatusReport.percent.toFixed(2) + ' %'}
              />
            </>
          )*/}
          {syncStatusReport.inProgress && syncStatusReport.currentBatch > 0 && (
            <>
              <DetailLine
                label="BATCHES"
                value={'Processing batch: ' + syncStatusReport.currentBatch + ' of a TOTAL of batches: ' + syncStatusReport.totalBatches}
              />
              <DetailLine
                label="Blocks per Batch"
                value={syncStatusReport.blocksPerBatch}
              />
              <DetailLine
                label="Time Processing the Current Batch (seconds)"
                value={syncStatusReport.secondsPerBatch}
              />
            </>
          )}
          {syncStatusReport.inProgress && syncStatusReport.currentBlock > 0 && !!syncStatusReport.lastBlockServer && (
            <>
              <View style={{ height: 2, width: '100%', backgroundColor: colors.primary, marginTop: 10 }}></View>
              <DetailLine
                label="BLOCKS"
                value={'Processing block: ' + syncStatusReport.currentBlock + ' of a TOTAL of blocks: ' + syncStatusReport.lastBlockServer}
              />
              {/*<DetailLine
                label="Blocks to Process / Sync"
                value={syncStatusReport.lastBlockServer - syncStatusReport.currentBlock}
              />*/}
            </>
          )}
          {/*
          <View style={{ height: 2, width: '100%', backgroundColor: colors.primary, marginTop: 10 }}></View>
          <DetailLine
            label="Wallet - LAST BLOCK - Sync & Stored"
            value={syncStatusReport.lastBlockWallet
              ? syncStatusReport.lastBlockWallet > birthday_plus_1
                ? syncStatusReport.lastBlockWallet
                : birthday_plus_1
              : '...loading...'}
          />
          <DetailLine
            label="Server - LAST BLOCK"
            value={syncStatusReport.lastBlockServer ? syncStatusReport.lastBlockServer : '...loading...'}
          />
          */}
        </View>

      </ScrollView>

      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
        <Button type="Secondary" title="Close" onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default SyncReportModal;
