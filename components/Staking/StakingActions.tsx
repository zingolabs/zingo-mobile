/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { RouteEnum } from '../../app/AppState';
import RegText from '../Components/RegText';
import { TriangleAlertIcon } from 'lucide-react-native';

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
      {stakingDay ? (
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
              paddingVertical: 7,
              backgroundColor: '#222223',
              borderColor: '#414141',
              borderWidth: 1,
              borderRadius: 16,
              marginHorizontal: 25,
              alignSelf: 'stretch',
            }}
          >
            <View
              style={{
                flexDirection: 'column',
                gap: 10,
                justifyContent: 'center',
                alignItems: 'flex-start',
                flexShrink: 1,
                paddingVertical: 10,
                paddingHorizontal: 5,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                <TriangleAlertIcon color={'#FFFFFF'} size={20} />
                <RegText
                  style={{ fontSize: 16, marginLeft: 5, fontWeight: '400' }}
                >
                  {' '}
                  Staking actions are currently disabled
                </RegText>
              </View>

              <RegText
                style={{
                  color: '#8E8E93',
                  marginLeft: 30,
                  fontSize: 14,
                  fontWeight: '400',
                }}
              >
                They will only be available during the next staking day
              </RegText>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default StakingActions;
