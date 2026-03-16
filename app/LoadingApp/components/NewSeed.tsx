/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useContext } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';

import { useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';

import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';
import Button from '../../../components/Components/Button';
import { ThemeType } from '../../types';
import { ContextAppLoading } from '../../context';
import {
  SnackbarDurationEnum,
  ButtonTypeEnum,
  ScreenEnum,
} from '../../AppState';
import { Header } from '../../../components/Header';
import Utils from '../../utils';
import Snackbars from '../../../components/Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type NewSeedProps = {
  onClickOK: () => void;
};
const NewSeed: React.FunctionComponent<NewSeedProps> = ({ onClickOK }) => {
  const context = useContext(ContextAppLoading);
  const {
    wallet,
    translate,
    netInfo,
    privacy,
    addLastSnackbar,
    snackbars,
    removeFirstSnackbar,
    setPrivacyOption,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Seed;

  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [expandSeed, setExpandSeed] = useState<boolean>(true);
  const [expandBirthday, setExpandBithday] = useState<boolean>(true);

  const seedPhrase = wallet.seed || '';
  const birthdayNumber = (wallet.birthday && wallet.birthday.toString()) || '';

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
    clear();
  };

  //console.log('=================================');
  //console.log(wallet.seed, wallet.birthday);
  //console.log('render seed', privacy);

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

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
            <TouchableOpacity
              onPress={() => {
                if (seedPhrase) {
                  Clipboard.setString(seedPhrase);
                  if (addLastSnackbar) {
                    addLastSnackbar({
                      message: translate('seed.tapcopy-seed-message') as string,
                      duration: SnackbarDurationEnum.short,
                      screenName: [screenName],
                    });
                  }
                  setExpandSeed(true);
                  if (privacy) {
                    setTimeout(() => {
                      setExpandSeed(false);
                    }, 5 * 1000);
                  }
                }
              }}
            >
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
              <TouchableOpacity
                onPress={() => {
                  if (seedPhrase) {
                    Clipboard.setString(seedPhrase);
                    if (addLastSnackbar) {
                      addLastSnackbar({
                        message: translate(
                          'seed.tapcopy-seed-message',
                        ) as string,
                        duration: SnackbarDurationEnum.short,
                        screenName: [screenName],
                      });
                    }
                  }
                }}
              >
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
                    addLastSnackbar({
                      message: translate(
                        'seed.tapcopy-birthday-message',
                      ) as string,
                      duration: SnackbarDurationEnum.short,
                      screenName: [screenName],
                    });
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
            type={ButtonTypeEnum.Primary}
            style={{
              backgroundColor: colors.primary,
            }}
            title={!!texts && !!texts.new ? texts.new[0] : ''}
            onPress={() => onClickOKHide()}
          />
        </View>
      </View>
    </ToastProvider>
  );
};

export default NewSeed;
