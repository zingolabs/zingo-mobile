/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useContext } from 'react';
import { View, Image, SafeAreaView, ScrollView, TouchableOpacity, Text, TextInput } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Toast from 'react-native-simple-toast';
import Clipboard from '@react-native-community/clipboard';
import { TranslateOptions } from 'i18n-js';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import ZecAmount from '../Components/ZecAmount';
import Button from '../Button';
import { ThemeType } from '../../app/types';
import { ContextLoaded, ContextLoading } from '../../app/context';
import { WalletSeedType } from '../../app/AppState';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type SeedProps = {
  onClickOK: (seedPhrase: string, birthdayNumber: number) => void;
  onClickCancel: () => void;
  action: 'new' | 'change' | 'view' | 'restore' | 'backup' | 'server';
};
const Seed: React.FunctionComponent<SeedProps> = ({ onClickOK, onClickCancel, action }) => {
  const contextLoaded = useContext(ContextLoaded);
  const contextLoading = useContext(ContextLoading);
  let walletSeed: WalletSeedType, totalBalance, translate: (key: string, config?: TranslateOptions) => string, info;
  if (action === 'new' || action === 'restore') {
    walletSeed = contextLoading.walletSeed;
    totalBalance = contextLoading.totalBalance;
    translate = contextLoading.translate;
    info = contextLoading.info;
  } else {
    walletSeed = contextLoaded.walletSeed;
    totalBalance = contextLoaded.totalBalance;
    translate = contextLoaded.translate;
    info = contextLoaded.info;
  }

  const { colors } = useTheme() as unknown as ThemeType;
  const [seedPhrase, setSeedPhrase] = useState('');
  const [birthdayNumber, setBirthdayNumber] = useState(0);
  const [times, setTimes] = useState(0);
  const [texts, setTexts] = useState({} as TextsType);
  const [readOnly, setReadOnly] = useState(true);

  useEffect(() => {
    const buttonTextsArray: string = translate('seed.buttontexts');
    let buttonTexts = {} as TextsType;
    if (typeof buttonTextsArray === 'object') {
      buttonTexts = buttonTextsArray as TextsType;
      setTexts(buttonTexts);
    }
    setReadOnly(
      action === 'new' || action === 'view' || action === 'change' || action === 'backup' || action === 'server',
    );
    setTimes(action === 'change' || action === 'backup' || action === 'server' ? 1 : 0);
    setSeedPhrase(walletSeed?.seed || '');
    setBirthdayNumber(walletSeed?.birthday || 0);
  }, [action, walletSeed?.seed, walletSeed?.birthday, walletSeed, translate]);

  //console.log('=================================');
  //console.log(walletSeed?.seed, walletSeed?.birthday);
  //console.log(seedPhrase, birthdayNumber);

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
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
          source={require('../../assets/img/logobig-zingo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain' }}
        />
        <ZecAmount
          currencyName={info?.currencyName ? info.currencyName : ''}
          size={36}
          amtZec={totalBalance.total}
          style={{ opacity: 0.5 }}
        />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          {translate('seed.title')} ({translate(`seed.${action}`)})
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </View>

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <FadeText style={{ marginTop: 0, padding: 20, textAlign: 'center' }}>
          {readOnly ? translate('seed.text-readonly') : translate('seed.text-no-readonly')}
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
            <View
              accessible={true}
              accessibilityLabel={translate('seed.seed-acc')}
              style={{
                margin: 0,
                borderWidth: 1,
                borderRadius: 10,
                borderColor: colors.text,
                maxWidth: '100%',
                maxHeight: '70%',
                minWidth: '95%',
                minHeight: 100,
              }}>
              <TextInput
                placeholder={translate('seed.seedplaceholder')}
                placeholderTextColor={colors.placeholder}
                multiline
                style={{
                  color: colors.text,
                  fontWeight: '600',
                  fontSize: 16,
                  minWidth: '95%',
                  minHeight: 100,
                  marginLeft: 5,
                }}
                value={seedPhrase}
                onChangeText={(text: string) => setSeedPhrase(text)}
                editable={true}
              />
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View />
            <TouchableOpacity
              onPress={() => {
                if (seedPhrase) {
                  Clipboard.setString(seedPhrase);
                  Toast.show(translate('seed.tapcopy-message'), Toast.LONG);
                }
              }}>
              <Text
                style={{
                  color: colors.text,
                  textDecorationLine: 'underline',
                  padding: 10,
                  marginTop: 0,
                  textAlign: 'center',
                  minHeight: 48,
                }}>
                {translate('seed.tapcopy')}
              </Text>
            </TouchableOpacity>
            <View />
          </View>
        </View>

        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <FadeText style={{ textAlign: 'center' }}>{translate('seed.birthday-readonly')}</FadeText>
          {readOnly ? (
            <RegText color={colors.text} style={{ textAlign: 'center' }}>
              {birthdayNumber.toString()}
            </RegText>
          ) : (
            <>
              <FadeText style={{ textAlign: 'center' }}>{translate('seed.birthday-no-readonly')}</FadeText>
              <View
                accessible={true}
                accessibilityLabel={translate('seed.birthday-acc')}
                style={{
                  margin: 10,
                  borderWidth: 1,
                  borderRadius: 10,
                  borderColor: colors.text,
                  width: '30%',
                  maxWidth: '40%',
                  maxHeight: 48,
                  minWidth: '20%',
                  minHeight: 48,
                }}>
                <TextInput
                  placeholder="#"
                  style={{
                    color: colors.text,
                    fontWeight: '600',
                    fontSize: 18,
                    minWidth: '20%',
                    minHeight: 48,
                    marginLeft: 5,
                  }}
                  value={birthdayNumber.toString()}
                  onChangeText={(text: string) => setBirthdayNumber(Number(text))}
                  editable={true}
                  keyboardType="numeric"
                />
              </View>
            </>
          )}
        </View>

        {times === 3 && action === 'change' && (
          <FadeText style={{ marginTop: 20, padding: 20, textAlign: 'center', color: 'white' }}>
            {translate('seed.change-warning')}
          </FadeText>
        )}
        {times === 3 && action === 'backup' && (
          <FadeText style={{ marginTop: 20, padding: 20, textAlign: 'center', color: 'white' }}>
            {translate('seed.backup-warning')}
          </FadeText>
        )}
        {times === 3 && action === 'server' && (
          <FadeText style={{ marginTop: 20, padding: 20, textAlign: 'center', color: 'white' }}>
            {translate('seed.server-warning')}
          </FadeText>
        )}

        {info?.currencyName !== 'ZEC' && times === 3 && (action === 'change' || action === 'server') && (
          <FadeText style={{ color: colors.primary, textAlign: 'center', width: '100%' }}>
            {translate('seed.mainnet-warning')}
          </FadeText>
        )}
        <View style={{ marginBottom: 30 }} />
      </ScrollView>
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button
          type="Primary"
          style={{
            backgroundColor: times === 3 ? 'red' : colors.primary,
            color: times === 3 ? 'white' : colors.primary,
          }}
          title={!!texts && !!texts[action] ? texts[action][times] : ''}
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
          <Button type="Secondary" title={translate('cancel')} style={{ marginLeft: 10 }} onPress={onClickCancel} />
        )}
      </View>
    </SafeAreaView>
  );
};

export default Seed;
