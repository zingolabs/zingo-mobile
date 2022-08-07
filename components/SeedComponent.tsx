/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, Image, Text} from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import {RegText, FadeText, ClickableText, ZecAmount, UsdAmount, zecPrice} from './Components';
import {TotalBalance, Transaction, Info, SyncStatus} from '../app/AppState';
import Button from './Button';
import {useTheme} from '@react-navigation/native';
import Toast from 'react-native-simple-toast';

type SeedComponentProps = {
  seed?: string;
  birthday?: number;
  nextScreen: () => void;
};
const SeedComponent: React.FunctionComponent<SeedComponentProps> = ({seed, birthday, nextScreen, totalBalance}) => {
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
      <View
        style={{display: 'flex', alignItems: 'center', paddingBottom: 10, backgroundColor: colors.card, zIndex: -1, paddingTop: 10}}>
        <Image source={require('../assets/img/logobig-zingo.png')} style={{width: 80, height: 80, resizeMode: 'contain'}} />
        <ZecAmount size={36} amtZec={totalBalance.total} style={{opacity: 0.4}} />
        <RegText color={colors.money} style={{marginTop: 5, padding: 5}}>Seed</RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary}}></View>
      </View>

      <FadeText style={{marginTop: 20, padding: 20, textAlign: 'center'}}>
        This is your seed phrase. Please write it down carefully. It is the only way to restore your wallet.
      </FadeText>
      <View
        style={{
          margin: 10,
          padding: 10,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: colors.text
        }}>
        <RegText
          color={colors.text}
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
      <RegText color={colors.text} style={{textAlign: 'center'}}>{birthday}</RegText>

      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
        <Button type="Primary" title={"I have saved \n the seed"} onPress={nextScreen} />
      </View>
    </View>
  );
};

export default SeedComponent;
