/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {View, Image, Text} from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import {RegText, RegTextInput, FadeText, ClickableText, ZecAmount, UsdAmount, zecPrice} from './Components';
import {TotalBalance, Transaction, Info, SyncStatus} from '../app/AppState';
import Button from './Button';
import {useTheme} from '@react-navigation/native';
import Toast from 'react-native-simple-toast';
import cstyles from './CommonStyles';

type SeedComponentProps = {
  seed?: string;
  birthday?: number;
  onClickOK: () => void;
  onClickCancel: () => void;
  totalBalance: TotalBalance;
  action: "new" | "change" | "view" | "restore" | "backup";
};
const SeedComponent: React.FunctionComponent<SeedComponentProps> = ({seed, birthday, onClickOK, onClickCancel, totalBalance, action}) => {
  const {colors} = useTheme();
  const texts = {
    new: [
      "I have saved \n the seed"
    ],
    change: [
      "",
      "I have saved \n the seed",
      "You really want \n to change your \n actual wallet",
      "Are you sure \n 100% or more"
    ],
    view: [
      "I have saved \n the seed"
    ],
    restore: [
      "Restore Wallet"
    ],
    backup: [
      "",
      "I have saved \n the seed",
      "You really want \n to restore your \n backup wallet",
      "Are you sure \n 100% or more"
    ]
  };
  const readOnly = action === "new" || action === "view" || action === "change" || action === "backup";
  const [seedPhrase, setSeedPhrase] = useState(seed);
  const [birthdayNumber, setBirthdayNumber] = useState(birthday);
  const [times, setTimes] = useState(action === "change" || action === "backup" ? 1 : 0);

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
        <RegText color={colors.money} style={{marginTop: 5, padding: 5}}>Seed ({action})</RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary}}></View>
      </View>

      <FadeText style={{marginTop: 20, padding: 20, textAlign: 'center'}}>
        {readOnly ? (
          "This is your seed phrase. Please write it down carefully. It is the only way to restore your actual wallet."
        ) : (
          "Enter your seed phrase (24 words)"
        )}
      </FadeText>
      <View
        style={{
          margin: 10,
          padding: 10,
          borderWidth: 1,
          borderRadius: 10,
          borderColor: colors.text
        }}>
        {readOnly ? (
          <RegText
            color={colors.text}
            style={{
              textAlign: 'center',
            }}>
            {seedPhrase}
          </RegText>
        ) : (
          <RegTextInput
            multiline
            style={{
              margin: 10,
              padding: 10,
              borderWidth: 1,
              borderRadius: 10,
              borderColor: colors.text,
              maxWidth: '95%',
              minWidth: '95%',
              minHeight: '20%',
              color: colors.text,
            }}
            value={seedPhrase}
            onChangeText={(text: string) => setSeedPhrase(text)}
          />
        )}
        <ClickableText
          style={{padding: 10, marginTop: 10, textAlign: 'center'}}
          onPress={() => {
            if (seedPhrase) {
              Clipboard.setString(seedPhrase);
              Toast.show('Copied Seed to Clipboard', Toast.LONG);
            }
          }}>
          Tap to copy
        </ClickableText>
      </View>

      <View style={{marginTop: 10, alignItems: 'center'}}>
        <FadeText style={{textAlign: 'center'}}>Wallet Birthday</FadeText>
        {readOnly ? (
          <RegText color={colors.text} style={{textAlign: 'center'}}>{birthdayNumber}</RegText>
        ) : (
          <>
            <FadeText style={{textAlign: 'center'}}>Block height of first transaction. (It's OK, if you don't know)</FadeText>
            <RegTextInput
              style={[
                {
                  margin: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderRadius: 10,
                  borderColor: colors.text,
                  width:'40%',
                  color: colors.text
                },
                cstyles.innerpaddingsmall,
              ]}
              value={birthdayNumber}
              keyboardType="numeric"
              onChangeText={(text: string) => setBirthdayNumber(text)}
            />
          </>
        )}
      </View>

      <FadeText style={{marginTop: 20, padding: 20, textAlign: 'center', color: 'white'}}>
        {times === 3 && action === "change" && (
          "YOU WILL HAVE NO LONGER ACCESS TO THIS WALLET, AND YOU ARE GOING TO ACCESS TO ANOTHER DIFFERENT WALLET"
        )}
        {times === 3 && action === "backup" && (
          "YOU WILL HAVE NO LONGER ACCESS TO THIS WALLET, AND YOU ARE GOING TO ACCESS TO YOUR BACKUP WALLET"
        )}
      </FadeText>

      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 20}}>
        <Button
          type="Primary"
          style={{ backgroundColor: times === 3 ? 'red' : colors.primary, color: times === 3 ? 'white' : colors.primary }}
          title={texts[action][times]}
          onPress={() => {
            if (!seedPhrase) return;
            if(times === 0 || times === 3) {
              onClickOK(seedPhrase, birthdayNumber);
            } else if(times === 1 || times === 2) {
              setTimes(times + 1);
            }
          }}
        />
        {(times > 0 || action === "restore") && (
          <Button type="Secondary" title="Cancel" style={{marginLeft: 10}} onPress={onClickCancel} />
        )}
      </View>
    </View>
  );
};

export default SeedComponent;
