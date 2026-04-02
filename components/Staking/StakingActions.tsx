/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { RouteEnum } from '../../app/AppState';

type StakingActionsProps = {};

const StakingActions: React.FC<StakingActionsProps> = () => {
  const navigation: any = useNavigation();

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 10,
        gap: 20,
      }}
    >
      <>
        <Pressable
          onPress={() => navigation.navigate(RouteEnum.Stake)}
          style={{
            backgroundColor: '#1C78D24D',
            paddingVertical: 14,
            borderRadius: 50,
            alignItems: 'center',
            width: 120,
          }}
        >
          <Text style={{ color: '#8FBFFA' }}>Stake</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            navigation.navigate(RouteEnum.Unstake, {
              finalizer: undefined,
              staked: undefined,
            })
          }
          style={{
            alignItems: 'center',
            backgroundColor: '#FFAF0E4D',
            paddingVertical: 14,
            borderRadius: 50,
            width: 120,
          }}
        >
          <Text style={{ color: '#FFAF0E' }}>Unstake</Text>
        </Pressable>
      </>
    </View>
  );
};

export default StakingActions;
