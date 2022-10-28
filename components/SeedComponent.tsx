/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { View, Image, SafeAreaView, ScrollView } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import { RegText, RegTextInput, FadeText, ClickableText, ZecAmount } from './Components';
import { TotalBalance } from '../app/AppState';
import Button from './Button';
import { useTheme } from '@react-navigation/native';
import Toast from 'react-native-simple-toast';

type SeedComponentProps = {
  seed?: string;
  birthday?: number;
  onClickOK: () => void;
  onClickCancel: () => void;
  totalBalance: TotalBalance;
  action: 'new' | 'change' | 'view' | 'restore' | 'backup' | 'server';
  error?: string;
  currencyName?: string;
};
const SeedComponent: React.FunctionComponent<SeedComponentProps> = ({
  seed,
  birthday,
  onClickOK,
  onClickCancel,
  totalBalance,
  action,
  error,
  currencyName,
}) => {
  const { colors } = useTheme();
  const [seedPhrase, setSeedPhrase] = useState(null);
  const [birthdayNumber, setBirthdayNumber] = useState(null);
  const [times, setTimes] = useState(0);
  const [texts, setTexts] = useState({});
  const [readOnly, setReadOnly] = useState(true);

  useEffect(() => {
    setTexts({
      new: ['I have saved \n the seed'],
      change: [
        '',
        'I have saved \n the seed',
        'You really want \n to change your \n actual wallet',
        'Are you sure \n 100% or more',
      ],
      server: [
        '',
        'I have saved \n the seed',
        'You really want \n to change your \n actual server',
        'Are you sure \n 100% or more',
      ],
      view: ['I have saved \n the seed'],
      restore: ['Restore Wallet'],
      backup: [
        '',
        'I have saved \n the seed',
        'You really want \n to restore your \n backup wallet',
        'Are you sure \n 100% or more',
      ],
    });
    setReadOnly(
      action === 'new' || action === 'view' || action === 'change' || action === 'backup' || action === 'server',
    );
    setTimes(action === 'change' || action === 'backup' || action === 'server' ? 1 : 0);
    setSeedPhrase(seed);
    setBirthdayNumber(birthday);
  }, [action, seed, birthday]);

  //console.log(seed, birthday, onClickOK, onClickCancel, totalBalance, action, error, currencyName);

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        backgroundColor: colors.background,
        height: '100%',
      }}>
      <View
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingBottom: 10,
          backgroundColor: colors.card,
          zIndex: -1,
          paddingTop: 10,
        }}>
        <Image
          source={require('../assets/img/logobig-zingo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain' }}
        />
        <ZecAmount
          currencyName={currencyName ? currencyName : ''}
          size={36}
          amtZec={totalBalance.total}
          style={{ opacity: 0.4 }}
        />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          Seed ({action})
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </View>

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          backgroundColor: colors.background,
        }}>
        <FadeText style={{ marginTop: 0, padding: 20, textAlign: 'center' }}>
          {readOnly
            ? 'This is your seed phrase. Please write it down carefully. It is the only way to restore your actual wallet.'
            : 'Enter your seed phrase (24 words)'}
        </FadeText>
        <View
          style={{
            margin: 10,
            padding: 10,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: colors.text,
            maxHeight: '40%',
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
                margin: 0,
                padding: 10,
                borderWidth: 1,
                borderRadius: 10,
                borderColor: colors.text,
                maxWidth: '100%',
                minWidth: '95%',
                minHeight: '50%',
                maxHeight: '70%',
                color: colors.text,
              }}
              value={seedPhrase}
              onChangeText={(text: string) => setSeedPhrase(text)}
            />
          )}
          <ClickableText
            style={{ padding: 10, marginTop: 0, textAlign: 'center' }}
            onPress={() => {
              if (seedPhrase) {
                Clipboard.setString(seedPhrase);
                Toast.show('Copied Seed to Clipboard', Toast.LONG);
              }
            }}>
            Tap to copy
          </ClickableText>
        </View>

        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <FadeText style={{ textAlign: 'center' }}>Wallet Birthday</FadeText>
          {readOnly ? (
            <RegText color={colors.text} style={{ textAlign: 'center' }}>
              {birthdayNumber}
            </RegText>
          ) : (
            <>
              <FadeText style={{ textAlign: 'center' }}>
                Block height of first transaction. (It's OK, if you don't know)
              </FadeText>
              <RegTextInput
                style={{
                  margin: 10,
                  padding: 10,
                  borderWidth: 1,
                  borderRadius: 10,
                  borderColor: colors.text,
                  width: '40%',
                  color: colors.text,
                }}
                value={birthdayNumber}
                keyboardType="numeric"
                onChangeText={(text: string) => setBirthdayNumber(text)}
              />
            </>
          )}
        </View>

        <FadeText style={{ marginTop: 20, padding: 20, textAlign: 'center', color: 'white' }}>
          {times === 3 &&
            action === 'change' &&
            'YOU WILL HAVE NO LONGER ACCESS TO THIS WALLET, AND YOU ARE GOING TO ACCESS TO ANOTHER DIFFERENT WALLET'}
          {times === 3 &&
            action === 'backup' &&
            'YOU WILL HAVE NO LONGER ACCESS TO THIS WALLET, AND YOU ARE GOING TO ACCESS TO YOUR BACKUP WALLET'}
          {times === 3 &&
            action === 'server' &&
            "YOU WILL HAVE NO LONGER ACCESS TO THIS WALLET, AND YOU ARE GOING TO CHANGE TO ANOTHER SERVER IN WHICH YOUR ACTUAL WALLET DOESN'T EXIST"}
        </FadeText>

        {currencyName !== 'ZEC' && times === 3 && (action === 'change' || action === 'server') && (
          <FadeText style={{ color: colors.primary, textAlign: 'center', width: '100%' }}>
            NO BACKUP OF THIS WALLET. ONLY IN MAINNET.
          </FadeText>
        )}

        {!!error && <FadeText style={{ color: colors.primary, textAlign: 'center', width: '100%' }}>{error}</FadeText>}

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 20 }}>
          <Button
            type="Primary"
            style={{
              backgroundColor: times === 3 ? 'red' : colors.primary,
              color: times === 3 ? 'white' : colors.primary,
            }}
            title={!!texts && texts[action]!! ? texts[action][times] : ''}
            onPress={() => {
              if (!seedPhrase) {
                return;
              }
              if (times === 0 || times === 3) {
                onClickOK(seedPhrase, birthdayNumber);
              } else if (times === 1 || times === 2) {
                setTimes(times + 1);
              }
            }}
          />
          {(times > 0 || action === 'restore') && (
            <Button type="Secondary" title="Cancel" style={{ marginLeft: 10 }} onPress={onClickCancel} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SeedComponent;
