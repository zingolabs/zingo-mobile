/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { RouteEnum } from '../../app/AppState';
import RegText from '../Components/RegText';
import { TriangleAlert } from '../Components/Icons/TriangleAlert';

type StakingActionsProps = {
  stakingDay: boolean;
};

const StakingActions: React.FC<StakingActionsProps> = ({ stakingDay }) => {
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
      {stakingDay || true ? (
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
      ) : (
        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              marginTop: 30,
              paddingHorizontal: 15,
              paddingRight: 20,
              paddingVertical: 7,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(65, 65, 65, 1)',
              borderRadius: 25,
              margin: 25,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 1,
                padding: 10,
              }}
            >
              <TriangleAlert color={'#8e8e93'} size={24} />
              <View>
                <RegText>Staking actions are currently disabled.</RegText>
                <RegText style={{ color: '#8e8e93' }}>
                  They will only be available during the next staking day.
                </RegText>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default StakingActions;
