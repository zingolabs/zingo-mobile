/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import RegText from '../../../components/Components/RegText';
import { AppDrawerParamList, ThemeType } from '../../types';
import { ContextAppLoaded } from '../../context';
import Header from '../../../components/Header';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import { RouteEnum, ScreenEnum } from '../../AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';

type ComputingTxContentProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Computing>;

const ComputingTxContent: React.FunctionComponent<ComputingTxContentProps> = ({}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language } = context;
  const { colors } = useTheme() as ThemeType;
  moment.locale(language);
  const screenName = ScreenEnum.ComputingTxContext;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}>
      <Header
        title={translate('send.sending-title') as string}
        screenName={screenName}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
      />
      <View
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '70%',
        }}>
        <RegText>{translate('loadedapp.computingtx') as string}</RegText>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        <RegText>{translate('wait') as string}</RegText>
      </View>
    </View>
  );
};

export default ComputingTxContent;
