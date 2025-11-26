/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { DrawerScreenProps } from '@react-navigation/drawer';

import RegText from '../Components/RegText';
import { RouteEnum } from '../../app/AppState';
import { AppDrawerParamList } from '../../app/types';
import { ThemeType } from '../../app/types/ThemeType';

type StakingProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Staking>;
const StakingScreen: React.FC<StakingProps> = () => {
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <>
      <View
        style={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RegText
          color={colors.text}
          style={{ fontSize: 30, alignSelf: 'center', marginBottom: 20 }}
        >
          Staking
        </RegText>
        {/* <LiquidPrimaryButton
          title="Accept"
          tintColor={colors.primary}
          onPress={() => {
            console.log('hey');
          }}
        /> */}
      </View>
    </>
  );
};

export default StakingScreen;
