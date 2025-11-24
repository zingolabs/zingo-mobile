/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faGear } from '@fortawesome/free-solid-svg-icons';

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
        style={{ marginRight: 20 }}
        testID="header.settings"
        onPress={() => {
          navigation.navigate(RouteEnum.SettingsMenu);
        }}
      >
        <FontAwesomeIcon icon={faGear} size={20} color={colors.border} />
      </TouchableOpacity>
    </View>
  );
};

export default SettingsButton;
