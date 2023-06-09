/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ActivityIndicator, SafeAreaView, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import RegText from '../../../components/Components/RegText';
import { ThemeType } from '../../types';
import CircularProgress from '../../../components/Components/CircularProgress';
import { ContextAppLoaded } from '../../context';
import Header from '../../../components/Header';
import FadeText from '../../../components/Components/FadeText';

const ComputingTxContent: React.FunctionComponent = () => {
  const context = useContext(ContextAppLoaded);
  const { sendProgress: progress, translate, syncingStatusReport } = context;
  const { colors } = useTheme() as unknown as ThemeType;

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
        title={translate('send.sending-title') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
      />
      <View
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '70%',
        }}>
        <RegText>{translate('loadedapp.computingtx') as string}</RegText>
        {!(progress && progress.sendInProgress) && (
          <>
            <RegText>{translate('loadedapp.syncing') as string}</RegText>
            {syncingStatusReport.inProgress &&
              syncingStatusReport.currentBlock > 0 &&
              !!syncingStatusReport.lastBlockServer && <ActivityIndicator size="large" color={colors.primary} />}
          </>
        )}
        {__DEV__ && !(progress && progress.sendInProgress) && (
          <>
            {syncingStatusReport.inProgress && syncingStatusReport.currentBatch > 0 && (
              <FadeText>
                {(translate('report.processingbatch') as string) +
                  syncingStatusReport.currentBatch +
                  (translate('report.totalbatches') as string) +
                  syncingStatusReport.totalBatches}
              </FadeText>
            )}
            {syncingStatusReport.inProgress &&
              syncingStatusReport.currentBlock > 0 &&
              !!syncingStatusReport.lastBlockServer && (
                <FadeText>
                  {(translate('report.processingblock') as string) +
                    syncingStatusReport.currentBlock +
                    (translate('report.totalblocks') as string) +
                    syncingStatusReport.lastBlockServer}
                </FadeText>
              )}
          </>
        )}
        {!(progress && progress.sendInProgress) && <RegText>{translate('wait') as string}</RegText>}
        {progress && progress.sendInProgress && (
          <>
            <RegText>{`${translate('loadedapp.step')} ${progress.progress} ${translate('loadedapp.of')} ${
              progress.total
            }`}</RegText>
            <RegText style={{ marginBottom: 20 }}>{`${translate('loadedapp.eta')} ${progress.etaSeconds} ${translate(
              'loadedapp.sec',
            )}`}</RegText>
            <CircularProgress
              size={100}
              strokeWidth={5}
              textSize={20}
              text={(((progress.progress + 1) * 100) / 4).toFixed(0).toString() + '%'}
              progressPercent={((progress.progress + 1) * 100) / 4}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default ComputingTxContent;
