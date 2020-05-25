/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, TouchableOpacity, Clipboard} from 'react-native';
import {PrimaryButton, BoldText, RegText} from './Components';
import cstyles from './CommonStyles';
import {useTheme} from '@react-navigation/native';
import Toast from 'react-native-simple-toast';

type SeedComponentProps = {
  seed?: string;
  birthday?: number;
  nextScreen: () => void;
};
const SeedComponent: React.FunctionComponent<SeedComponentProps> = ({seed, birthday, nextScreen}) => {
  const {colors} = useTheme();

  return (
    <View
      style={[
        {
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        },
      ]}>
      <BoldText style={cstyles.center}>
        This is your seed phrase. Please write it down carefully. It is the only way to restore your wallet.
      </BoldText>
      <TouchableOpacity
        style={[cstyles.margintop, {padding: 10, backgroundColor: '#212124'}]}
        onPress={() => {
          if (seed) {
            Clipboard.setString(seed);
            Toast.show('Copied Seed to Clipboard', Toast.LONG);
          }
        }}>
        <RegText style={{textAlign: 'center', backgroundColor: colors.card, padding: 10}}>{seed}</RegText>
      </TouchableOpacity>
      <View style={[cstyles.margintop]}>
        <BoldText style={{textAlign: 'center'}}>Wallet Birthday</BoldText>
      </View>
      <RegText style={{textAlign: 'center'}}>{birthday}</RegText>
      <View style={[cstyles.margintop]}>
        <PrimaryButton title="I have saved the seed" onPress={nextScreen} />
      </View>
    </View>
  );
};

export default SeedComponent;
