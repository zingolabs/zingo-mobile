/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ActivityIndicator, SafeAreaView, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import RegText from '../../../components/Components/RegText';
import { ThemeType } from '../../types';
import CircularProgress from '../../../components/Components/CircularProgress';
import { ContextAppLoaded } from '../../context';
import Header from '../../../components/Header';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

const ComputingTxContent: React.FunctionComponent = () => {
  const context = useContext(ContextAppLoaded);
  const { sendProgress: progress, translate, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

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
        {progress && progress.sendInProgress ? (
          <>
            <RegText style={{ marginTop: 20 }}>{`${translate('loadedapp.step')} ${progress.progress} ${translate(
              'loadedapp.of',
            )} ${progress.total}`}</RegText>
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
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
          </>
        )}
        <RegText>{translate('wait') as string}</RegText>
      </View>
    </SafeAreaView>
  );
};

export default ComputingTxContent;
