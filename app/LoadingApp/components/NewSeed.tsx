/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';

import { useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';

import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';
import Button from '../../../components/Components/Button';
import { ThemeType } from '../../types';
import { ContextAppLoading } from '../../context';
import WalletType from '../../AppState/types/WalletType';
import {
  ModeEnum,
  SnackbarDurationEnum,
  ButtonTypeEnum,
  ScreenEnum,
} from '../../AppState';
import Header from '../../../components/Header';
import Utils from '../../utils';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type NewSeedProps = {
  wallet: WalletType;
  onClickOK: () => void;
};
const NewSeed: React.FunctionComponent<NewSeedProps> = ({
  wallet,
  onClickOK,
}) => {
  const context = useContext(ContextAppLoading);
  const {
    translate,
    netInfo,
    privacy,
    mode,
    addLastSnackbar,
    setPrivacyOption,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.Seed;

  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [expandSeed, setExpandSeed] = useState<boolean>(true);
  const [expandBirthday, setExpandBithday] = useState<boolean>(true);

  const seedPhrase = wallet.seed || '';
  const birthdayNumber = (wallet.birthday && wallet.birthday.toString()) || '';

  useEffect(() => {
    return () => {
      if (clipboardTimer.current) {
        clearTimeout(clipboardTimer.current);
      }
      Clipboard.setString('');
    };
  }, []);

  const copySeedToClipboard = (expandOnCopy?: boolean) => {
    if (!seedPhrase) return;
    if (clipboardTimer.current) {
      clearTimeout(clipboardTimer.current);
    }
    Clipboard.setString(seedPhrase);
    if (addLastSnackbar) {
      addLastSnackbar(
        translate('seed.tapcopy-seed-message') as string,
        SnackbarDurationEnum.longer,
      );
    }
    if (expandOnCopy) {
      setExpandSeed(true);
      if (privacy) {
        setTimeout(() => setExpandSeed(false), 5 * 1000);
      }
    }
    clipboardTimer.current = setTimeout(() => {
      Clipboard.setString('');
      clipboardTimer.current = null;
      if (addLastSnackbar) {
        addLastSnackbar(
          translate('seed.clipboard-cleared') as string,
          SnackbarDurationEnum.long,
        );
      }
    }, 60 * 1000);
  };

  useEffect(() => {
    if (privacy) {
      setExpandSeed(false);
      setExpandBithday(false);
    } else {
      setExpandSeed(true);
      setExpandBithday(true);
    }
  }, [privacy]);

  useEffect(() => {
    if (!expandSeed && !privacy) {
      setExpandSeed(true);
    }
  }, [expandSeed, privacy]);

  useEffect(() => {
    if (!expandBirthday && !privacy) {
      setExpandBithday(true);
    }
  }, [expandBirthday, privacy]);

  useEffect(() => {
    const buttonTextsArray = translate('seed.buttontexts');
    let buttonTexts = {} as TextsType;
    if (typeof buttonTextsArray === 'object') {
      buttonTexts = buttonTextsArray as TextsType;
      setTexts(buttonTexts);
    }
  }, [translate]);

  const onClickOKHide = () => {
    onClickOK();
  };

  //console.log('=================================');
  //console.log(wallet.seed, wallet.birthday);
  //console.log('render seed', privacy);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <Header
        title={translate('seed.title') + ' (' + translate(`seed.new`) + ')'}
        screenName={screenName}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noUfvkIcon={true}
        setPrivacyOption={setPrivacyOption}
        addLastSnackbar={addLastSnackbar}
        translate={translate}
        netInfo={netInfo}
        mode={mode}
        privacy={privacy}
        closeScreen={onClickOKHide}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ height: '80%', maxHeight: '80%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}
      >
        <RegText
          style={{
            marginTop: 0,
            padding: 20,
            textAlign: 'center',
            fontWeight: '900',
          }}
        >
          {translate('seed.text-readonly') as string}
        </RegText>
        <View
          style={{
            margin: 10,
            padding: 10,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: colors.text,
            maxHeight: '45%',
          }}
        >
          <TouchableOpacity onPress={() => copySeedToClipboard(true)}>
            <RegText
              color={colors.text}
              style={{
                textAlign: 'center',
              }}
            >
              {!expandSeed ? Utils.trimToSmall(seedPhrase, 5) : seedPhrase}
            </RegText>
          </TouchableOpacity>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between' }}
          >
            <View />
            <TouchableOpacity onPress={() => copySeedToClipboard(false)}>
              <Text
                style={{
                  color: colors.text,
                  textDecorationLine: 'underline',
                  padding: 10,
                  marginTop: 0,
                  textAlign: 'center',
                  minHeight: 48,
                }}
              >
                {translate('seed.tapcopy') as string}
              </Text>
            </TouchableOpacity>
            <View />
          </View>
        </View>

        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <FadeText style={{ textAlign: 'center' }}>
            {translate('seed.birthday-readonly') as string}
          </FadeText>
          <TouchableOpacity
            onPress={() => {
              if (birthdayNumber) {
                Clipboard.setString(birthdayNumber);
                if (addLastSnackbar) {
                  addLastSnackbar(
                    translate('seed.tapcopy-birthday-message') as string,
                    SnackbarDurationEnum.short,
                  );
                }
                setExpandBithday(true);
                if (privacy) {
                  setTimeout(() => {
                    setExpandBithday(false);
                  }, 5 * 1000);
                }
              }
            }}
          >
            <RegText color={colors.text} style={{ textAlign: 'center' }}>
              {!expandBirthday
                ? Utils.trimToSmall(birthdayNumber, 1)
                : birthdayNumber}
            </RegText>
          </TouchableOpacity>
        </View>
        <View style={{ marginBottom: 30 }} />
      </ScrollView>
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}
      >
        <Button
          type={
            mode === ModeEnum.basic
              ? ButtonTypeEnum.Secondary
              : ButtonTypeEnum.Primary
          }
          style={{
            backgroundColor:
              mode === ModeEnum.basic ? colors.background : colors.primary,
          }}
          title={
            mode === ModeEnum.basic
              ? (translate('cancel') as string)
              : !!texts && !!texts.new
                ? texts.new[0]
                : ''
          }
          onPress={() => onClickOKHide()}
        />
      </View>
    </View>
  );
};

export default NewSeed;
