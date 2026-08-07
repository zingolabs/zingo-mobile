/* eslint-disable react-native/no-inline-styles */
import React, { ReactNode, useContext } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '../../app/theme';

import FadeText from './FadeText';
import RegText from './RegText';
import { ContextAppLoaded } from '../../app/context';
import { SnackbarDurationEnum } from '../../app/AppState';

type DetailLineProps = {
  label: string;
  value?: string;
  children?: ReactNode;
  testID?: string;
};

const DetailLine: React.FunctionComponent<DetailLineProps> = ({
  label,
  value,
  children,
  testID,
}) => {
  const { colors } = useTheme();
  const context = useContext(ContextAppLoaded);
  const { addLastSnackbar, translate } = context;

  return (
    <View style={{ display: 'flex', marginTop: 20 }}>
      <FadeText>{label}</FadeText>
      {!!value && (
        <TouchableOpacity
          onPress={() => {
            Clipboard.setString(value);
            addLastSnackbar(
              translate('txtcopied') as string,
              SnackbarDurationEnum.short,
            );
          }}
        >
          <RegText testID={testID} color={colors.fgDefault}>
            {value}
          </RegText>
        </TouchableOpacity>
      )}
      {children}
    </View>
  );
};

export default DetailLine;
