/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faFaucet,
  faPaperPlane,
  faAngleDown,
} from '@fortawesome/free-solid-svg-icons';

import { ThemeType } from '../../../app/types';
import { RouteEnum } from '../../../app/AppState';
import FadeText from '../../Components/FadeText';

const ActionButton = ({
  icon,
  label,
  colors,
  onPress,
}: {
  icon: any;
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
      style={{ justifyContent: 'center', alignItems: 'center' }}
      onPress={onPress}
    >
      <View
        style={{
          borderRadius: 35,
          backgroundColor: colors.secondary,
          padding: 20,
          margin: 10,
        }}
      >
        <FontAwesomeIcon size={30} icon={icon} color={colors.text} />
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
        icon={faPaperPlane}
        label={'Send'}
        onPress={() => navigation.navigate(RouteEnum.Send)}
      />
      <ActionButton
        colors={colors}
        icon={faAngleDown}
        label={'Receive'}
        onPress={() => navigation.navigate(RouteEnum.Receive)}
      />
      <ActionButton
        colors={colors}
        icon={faFaucet}
        label={'Faucet'}
        onPress={() => navigation.navigate(RouteEnum.Faucet)}
      />
    </View>
  );
};

export default QuickActionsRow;
