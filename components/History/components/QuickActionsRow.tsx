/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

import { ThemeType } from '../../../app/types';
import { RouteEnum } from '../../../app/AppState';
import FadeText from '../../Components/FadeText';
import PaperPlane from '../../../assets/icons/paper-plane.svg';
import QrCode from '../../../assets/icons/qr.svg';
import FaucetIcon from '../../../assets/icons/faucet.svg';

const ActionButton = ({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  colors: ThemeType;
  onPress: () => void;
}) => (
  <View
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginHorizontal: 8,
    }}
  >
    <TouchableOpacity
      style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onPress={onPress}
    >
      <View
        style={{
          borderRadius: 35,
          backgroundColor: '#1C78D24D',
          padding: 20,
          margin: 10,
        }}
      >
        {icon}
      </View>
      <FadeText>{label}</FadeText>
    </TouchableOpacity>
  </View>
);

const QuickActionsRow: React.FC = () => {
  const navigation: any = useNavigation();
  const { colors } = useTheme() as ThemeType;

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 10,
      }}
    >
      <ActionButton
        colors={colors}
        icon={<PaperPlane width={30} height={30} />}
        label={'Send'}
        onPress={() => navigation.navigate(RouteEnum.Send)}
      />
      <ActionButton
        colors={colors}
        icon={<QrCode width={30} height={30} />}
        label={'Receive'}
        onPress={() => navigation.navigate(RouteEnum.Receive)}
      />
      <ActionButton
        colors={colors}
        icon={<FaucetIcon width={30} height={30} color={'#8FBFFA'} />}
        label={'Faucet'}
        onPress={() => navigation.navigate(RouteEnum.Faucet)}
      />
    </View>
  );
};

export default QuickActionsRow;
