/* eslint-disable react-native/no-inline-styles */
import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import FadeText from '../../Components/FadeText';
import RegText from '../../Components/RegText';
import { ThemeType } from '../../../app/types';

type DetailLineProps = {
  label: string;
  value?: string;
  children?: ReactNode;
};

const DetailLine: React.FunctionComponent<DetailLineProps> = ({ label, value, children }) => {
  const { colors } = useTheme() as unknown as ThemeType;
  return (
    <View style={{ display: 'flex', marginTop: 20, flexDirection: 'row', alignItems: 'center' }}>
      <FadeText>{label}</FadeText>
      <View style={{ width: 10 }} />
      {value && <RegText color={colors.text}>{value}</RegText>}
      {children}
    </View>
  );
};

export default DetailLine;
