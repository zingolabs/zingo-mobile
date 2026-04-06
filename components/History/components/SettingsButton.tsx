/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import SettingsIcon from '../../../assets/icons/settings.svg';
import ChartPieIcon from '../../../assets/icons/chart-pie.svg';

import { ThemeType } from '../../../app/types';
import { RouteEnum, ScreenEnum } from '../../../app/AppState';

type SettingsButtonProps = {
  screenName: ScreenEnum;
};

const SettingsButton: React.FC<SettingsButtonProps> = ({ screenName }) => {
  const navigation: any = useNavigation();
  const { colors } = useTheme() as ThemeType;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 50,
        paddingHorizontal: 20,
        gap: 10,
      }}
    >
      {screenName === ScreenEnum.StakingHome && (
        <TouchableOpacity
          testID="header.finalizers"
          onPress={() => {
            navigation.navigate(RouteEnum.Distribution);
          }}
        >
          <ChartPieIcon height={30} width={30} color={colors.text} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        testID="header.settings"
        onPress={() => {
          navigation.navigate(RouteEnum.SettingsStack);
        }}
      >
        <SettingsIcon height={30} width={30} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
};

export default SettingsButton;
