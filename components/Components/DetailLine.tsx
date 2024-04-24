/* eslint-disable react-native/no-inline-styles */
import React, { ReactNode, useContext } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import { useTheme } from '@react-navigation/native';

import FadeText from './FadeText';
import RegText from './RegText';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { SnackbarDurationEnum } from '../../app/AppState';

type DetailLineProps = {
  label: string;
  value?: string;
  children?: ReactNode;
  testID?: string;
};

const DetailLine: React.FunctionComponent<DetailLineProps> = ({ label, value, children, testID }) => {
  const { colors } = useTheme() as unknown as ThemeType;
  const context = useContext(ContextAppLoaded);
  const { addLastSnackbar, translate, language } = context;
  moment.locale(language);

  return (
    <View style={{ display: 'flex', marginTop: 20 }}>
      <FadeText>{label}</FadeText>
      {!!value && (
        <TouchableOpacity
          onPress={() => {
            Clipboard.setString(value);
            addLastSnackbar({
              message: translate('txtcopied') as string,
              duration: SnackbarDurationEnum.short,
            });
          }}>
          <RegText testID={testID} color={colors.text}>
            {value}
          </RegText>
        </TouchableOpacity>
      )}
      {children}
    </View>
  );
};

export default DetailLine;
