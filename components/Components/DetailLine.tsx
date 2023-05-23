/* eslint-disable react-native/no-inline-styles */
import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import FadeText from './FadeText';
import RegText from './RegText';
import { ThemeType } from '../../app/types';

type DetailLineProps = {
  label: string;
  value?: string;
  children?: ReactNode;
  testID?: string;
};

const DetailLine: React.FunctionComponent<DetailLineProps> = ({ label, value, children, testID }) => {
  const { colors } = useTheme() as unknown as ThemeType;
  return (
    <View style={{ display: 'flex', marginTop: 20 }}>
      <FadeText>{label}</FadeText>
      <View style={{ width: 10 }} />
      {value && (
        <RegText testID={testID} color={colors.text}>
          {value}
        </RegText>
      )}
      {children}
    </View>
  );
};

export default DetailLine;
