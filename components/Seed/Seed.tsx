/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect } from 'react';
import { View, Image, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Toast from 'react-native-simple-toast';
import Clipboard from '@react-native-community/clipboard';
import { TranslateOptions } from 'i18n-js';

import RegText from '../Components/RegText';
import RegTextInput from '../Components/RegTextInput';
import FadeText from '../Components/FadeText';
import ClickableText from '../Components/ClickableText';
import ZecAmount from '../Components/ZecAmount';
import { TotalBalance } from '../../app/AppState';
import Button from '../Button';
import { ThemeType } from '../../app/types';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type SeedProps = {
  seed?: string;
  birthday?: number;
  onClickOK: (seedPhrase: string, birthdayNumber: number) => void;
  onClickCancel: () => void;
  totalBalance: TotalBalance;
  action: 'new' | 'change' | 'view' | 'restore' | 'backup' | 'server';
  currencyName?: string;
  translate: (key: string, config?: TranslateOptions) => any;
};
const Seed: React.FunctionComponent<SeedProps> = ({
  seed,
  birthday,
  onClickOK,
  onClickCancel,
  totalBalance,
  action,
  currencyName,
  translate,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;
  const [seedPhrase, setSeedPhrase] = useState('');
  const [birthdayNumber, setBirthdayNumber] = useState(0);
  const [times, setTimes] = useState(0);
  const [texts, setTexts] = useState({} as TextsType);
  const [readOnly, setReadOnly] = useState(true);

  useEffect(() => {
    setTexts(translate('seed.buttontexts'));
    setReadOnly(
      action === 'new' || action === 'view' || action === 'change' || action === 'backup' || action === 'server',
    );
    setTimes(action === 'change' || action === 'backup' || action === 'server' ? 1 : 0);
    setSeedPhrase(seed || '');
    setBirthdayNumber(birthday || 0);
  }, [action, seed, birthday, translate]);

  //console.log(seed, birthday, onClickOK, onClickCancel, totalBalance, action, currencyName);

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
          currencyName={currencyName ? currencyName : ''}
          size={36}
          amtZec={totalBalance.total}
          style={{ opacity: 0.4 }}
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View />
            <ClickableText
              style={{
                padding: 10,
                marginTop: 0,
                textAlign: 'center',
              }}
              onPress={() => {
                if (seedPhrase) {
                  Clipboard.setString(seedPhrase);
                  Toast.show(translate('seed.tapcopy-message'), Toast.LONG);
                }
              }}>
              {translate('seed.tapcopy')}
            </ClickableText>
            <View />
          </View>
        </View>

        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <FadeText style={{ textAlign: 'center' }}>{translate('seed.birthday-readonly')}</FadeText>
          {readOnly ? (
            <RegText color={colors.text} style={{ textAlign: 'center' }}>
              {birthdayNumber}
            </RegText>
          ) : (
            <>
              <FadeText style={{ textAlign: 'center' }}>{translate('seed.birthday-no-readonly')}</FadeText>
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
                onChangeText={(text: string) => setBirthdayNumber(Number(text))}
              />
            </>
          )}
        </View>

        <FadeText style={{ marginTop: 20, padding: 20, textAlign: 'center', color: 'white' }}>
          {times === 3 && action === 'change' && translate('seed.change-warning')}
          {times === 3 && action === 'backup' && translate('seed.backup-warning')}
          {times === 3 && action === 'server' && translate('seed.server-warning')}
        </FadeText>

        {currencyName !== 'ZEC' && times === 3 && (action === 'change' || action === 'server') && (
          <FadeText style={{ color: colors.primary, textAlign: 'center', width: '100%' }}>
            {translate('seed.mainnet-warning')}
          </FadeText>
        )}
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
