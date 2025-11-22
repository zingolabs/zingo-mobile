/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import RegText from '../../../components/Components/RegText';
import { AppDrawerParamList, ThemeType } from '../../types';
import { ContextAppLoaded } from '../../context';
import { RouteEnum } from '../../AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';

type ComputingTxContentProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Computing>;

const ComputingTxContent: React.FunctionComponent<ComputingTxContentProps> = ({}) => {
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme() as ThemeType;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}>
      <View
        style={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <RegText>{translate('loadedapp.computingtx') as string}</RegText>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        <RegText>{translate('wait') as string}</RegText>
      </View>
    </View>
  );
};

export default ComputingTxContent;
