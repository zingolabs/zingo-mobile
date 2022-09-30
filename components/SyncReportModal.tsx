/* eslint-disable react-native/no-inline-styles */
import React from 'react';
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
};

const SyncReportModal: React.FunctionComponent<SyncReportModalProps> = ({closeModal, totalBalance, currencyName, syncStatusReport}) => {
  const {colors} = useTheme();

  React.useEffect(() => {
    (async () => {

    })();
  }, [])

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
        <ZecAmount currencyName={currencyName} size={36} amtZec={totalBalance.total} style={{opacity: 0.4}} />
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
            value={syncStatusReport.syncID ? syncStatusReport.syncID + ' - (' + (syncStatusReport.inProgress ? 'Running' : 'Finished') + ')' : '...loading...'}
          />
          {!!syncStatusReport.lastError && (
            <>
              <View style={{ height: 2, width: '100%', backgroundColor: colors.primary, marginTop: 10 }}></View>
              <DetailLine
                label="Last Error"
                value={syncStatusReport.lastError}
              />
            </>
          )}
          {syncStatusReport.currentBatch > 0 && (
            <>
              <View style={{ height: 2, width: '100%', backgroundColor: colors.primary, marginTop: 10 }}></View>
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
          {syncStatusReport.currentBlock > 0 && (
            <>
              <View style={{ height: 2, width: '100%', backgroundColor: colors.primary, marginTop: 10 }}></View>
              <DetailLine
                label="BLOCKS"
                value={'Processing block: ' + syncStatusReport.currentBlock + ' of a TOTAL of blocks: ' + syncStatusReport.lastBlockServer}
              />
              <DetailLine
                label="Blocks to Process / Sync"
                value={syncStatusReport.lastBlockServer - syncStatusReport.currentBlock}
              />
            </>
          )}
          <View style={{ height: 2, width: '100%', backgroundColor: colors.primary, marginTop: 10 }}></View>
          <DetailLine
            label="Wallet - LAST BLOCK - Sync & Stored"
            value={syncStatusReport.lastBlockWallet ? syncStatusReport.lastBlockWallet : '...loading...'}
          />
          <DetailLine
            label="Server - LAST BLOCK"
            value={syncStatusReport.lastBlockServer ? syncStatusReport.lastBlockServer : '...loading...'}
          />
        </View>
      </ScrollView>

      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
        <Button type="Secondary" title="Close" onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default SyncReportModal;
