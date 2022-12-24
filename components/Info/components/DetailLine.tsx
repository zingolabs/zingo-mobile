/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import FadeText from '../../Components/FadeText';
import RegText from '../../Components/RegText';
import { ThemeType } from '../../../app/types';

type DetailLineProps = {
  label: string;
  value: string;
};

const DetailLine: React.FunctionComponent<DetailLineProps> = ({ label, value }) => {
  const { colors } = useTheme() as unknown as ThemeType;
  return (
    <View style={{ display: 'flex', marginTop: 20 }}>
      <FadeText>{label}</FadeText>
      <RegText color={colors.text}>{value}</RegText>
    </View>
  );
};

export default DetailLine;
