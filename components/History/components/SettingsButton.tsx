/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import SettingsIcon from '../../../assets/icons/settings.svg';

import { ThemeType } from '../../../app/types';
import { RouteEnum, ScreenEnum } from '../../../app/AppState';

type SettingsButtonProps = {
  screenName: ScreenEnum;
};

const SettingsButton: React.FC<SettingsButtonProps> = () => {
  const navigation: any = useNavigation();
  const { colors } = useTheme() as ThemeType;

  return (
    <View style={{ alignItems: 'flex-end' }}>
      <TouchableOpacity
        style={{ marginRight: 20, padding: 10 }}
        testID="header.settings"
        onPress={() => {
          navigation.navigate(RouteEnum.SettingsMenu);
        }}
      >
        <SettingsIcon height={24} width={24} color={colors.border} />
      </TouchableOpacity>
    </View>
  );
};

export default SettingsButton;
