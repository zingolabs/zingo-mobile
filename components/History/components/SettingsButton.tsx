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

const SettingsButton: React.FC<SettingsButtonProps> = ({
  screenName,
}) => {
  const navigation: any = useNavigation();
  const { colors } = useTheme() as ThemeType;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      {screenName === ScreenEnum.StakingHome && (
        <TouchableOpacity
          style={{ marginRight: 5, padding: 5 }}
          testID="header.finalizers"
          onPress={() => {
            navigation.navigate(RouteEnum.Distribution);
          }}
        >
          <ChartPieIcon height={22} width={22} color={colors.text} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={{ marginRight: 5, padding: 5 }}
        testID="header.settings"
        onPress={() => {
          navigation.navigate(RouteEnum.SettingsMenu);
        }}
      >
        <SettingsIcon height={24} width={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
};

export default SettingsButton;
