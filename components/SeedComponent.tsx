/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, Clipboard, Image, Text} from 'react-native';
import {PrimaryButton, RegText, FadeText, ClickableText} from './Components';
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
          alignItems: 'stretch',
          justifyContent: 'center',
          backgroundColor: colors.background,
        },
      ]}>
      <View>
        <View style={{alignItems: 'center', backgroundColor: colors.card, paddingBottom: 25, paddingTop: 25}}>
          <Text style={{marginTop: 5, padding: 5, color: colors.text, fontSize: 28}}>Wallet Seed</Text>
        </View>
        <View style={{display: 'flex', alignItems: 'center', marginTop: -25}}>
          <Image source={require('../assets/img/logobig.png')} style={{width: 50, height: 50, resizeMode: 'contain'}} />
        </View>
      </View>

      <FadeText style={{marginTop: 20, padding: 10, textAlign: 'center'}}>
        This is your seed phrase. Please write it down carefully. It is the only way to restore your wallet.
      </FadeText>
      <View style={{marginTop: 10, padding: 10, borderWidth: 1, borderRadius: 10, borderColor: colors.text}}>
        <RegText
          style={{
            textAlign: 'center',
          }}>
          {seed}
        </RegText>
        <ClickableText
          style={{padding: 10, marginTop: 10, textAlign: 'center'}}
          onPress={() => {
            if (seed) {
              Clipboard.setString(seed);
              Toast.show('Copied Seed to Clipboard', Toast.LONG);
            }
          }}>
          Tap to copy
        </ClickableText>
      </View>

      <View style={{marginTop: 10}}>
        <FadeText style={{textAlign: 'center'}}>Wallet Birthday</FadeText>
      </View>
      <RegText style={{textAlign: 'center'}}>{birthday}</RegText>

      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
        <PrimaryButton title="I have saved the seed" onPress={nextScreen} />
      </View>
    </View>
  );
};

export default SeedComponent;
