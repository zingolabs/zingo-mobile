/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';

import RegText from '../../../components/Components/RegText';
import { ThemeType } from '../../types';
import { ContextAppLoaded } from '../../context';
import Header from '../../../components/Header';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import Snackbars from '../../../components/Components/Snackbars';

const ComputingTxContent: React.FunctionComponent = () => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme() as ThemeType;
  const { top, bottom, right, left } = useSafeAreaInsets();
  moment.locale(language);

  return (
    <View
      style={{
        marginTop: top,
        marginBottom: bottom,
        marginRight: right,
        marginLeft: left,
        flex: 1,
        backgroundColor: colors.background,
      }}>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        translate={translate}
      />

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
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        <RegText>{translate('wait') as string}</RegText>
      </View>
    </View>
  );
};

export default ComputingTxContent;
