/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useContext } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput } from 'react-native';

import { useNavigation, useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import {
  SnackbarDurationEnum,
  ScreenEnum,
  RouteEnum,
} from '../../app/AppState';
import Utils from '../../app/utils';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';
import { BlurView } from '@react-native-community/blur';

type SeedProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Seed>;

const Seed: React.FunctionComponent<SeedProps> = ({
}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    wallet,
    translate,
    privacy,
    addLastSnackbar,
    snackbars,
    removeFirstSnackbar,
  } = context;
  const { colors } = useTheme() as ThemeType;
  // when this screen is open from LoadingApp (new wallet)
  // is using the standard modal from react-native
  const { clear } = useToast();
  const screenName = ScreenEnum.Seed;

  const SEED_LENGTH = 24;

  const [rows, setRows] = useState<string[][]>([]);

  const insets = useSafeAreaInsets();

  const [expandSeed, setExpandSeed] = useState<boolean>(true);
  const [expandBirthday, setExpandBithday] = useState<boolean>(true);
  const [seedBlurred, setSeedBlurred] = useState<boolean>(true);

  const seedPhrase = wallet.seed || '';
  const birthdayNumber = (wallet.birthday && wallet.birthday.toString()) || '';

  useEffect(() => {
    const seedTextArray: string[] = seedPhrase.split(' ');

    //console.log(seedTextArray);
    const _words = seedTextArray.slice(0, SEED_LENGTH);

    if (_words.length > 0) {
      const _rows: string[][] = [];
      for (let i = 0; i < SEED_LENGTH; i += 3) {
        _rows.push(_words.slice(i, i + 3));
      }
      setRows(_rows);
    }
  }, [seedPhrase]);

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

  const onClickCancelHide = () => {
    clear();
    hiding();
  };

  const hiding = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
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

      <HeaderTitle
        title="Seed phrase"
        goBack={() => {
          onClickCancelHide();
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 10,
        }}
      >
        <View
          style={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <FadeText style={{ padding: 10, textAlign: 'center', fontSize: 17 }}>
            {
              'Your seed phrase is the key to your wallet. Back it up so you can restore your wallet if you lose or damage your device '
            }
          </FadeText>

          {rows.length > 0 && (
            <View
              style={{
                marginTop: 10,
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={{ flexDirection: 'row', columnGap: 8 }}>
                  {row.map((word, colIndex) => {
                    const index = rowIndex * 3 + colIndex;
                    return (
                      <View
                        key={index}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'flex-start',
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: 25,
                          backgroundColor: colors.secondary,
                          width: '30%',
                          minWidth: '30%',
                          alignItems: 'center',
                          paddingHorizontal: 10,
                          paddingVertical: 0,
                          marginBottom: 5,
                        }}
                      >
                        <FadeText>{`${index + 1}`}.</FadeText>
                        <TextInput
                          style={{
                            flexGrow: 1,
                            flexShrink: 1,
                            color: colors.text,
                            fontWeight: '400',
                            fontSize: 15,
                            lineHeight: 15,
                            backgroundColor: 'transparent',
                          }}
                          value={word}
                          editable={false}
                          keyboardType="default"
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="done"
                        />
                      </View>
                    );
                  })}
                </View>
              ))}

              {seedBlurred && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <BlurView
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                    blurType="dark"
                    blurAmount={2}
                    reducedTransparencyFallbackColor="rgba(0,0,0,0.3)"
                  />

                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => setSeedBlurred(false)}
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: 20,
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      alignSelf: 'center',
                    }}
                  >
                    <RegText
                      style={{
                        color: 'white',
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                    >
                      View seed phrase
                    </RegText>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          )}

          <TouchableOpacity
            style={{ alignSelf: 'center' }}
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
                setExpandSeed(true);
                if (privacy) {
                  setTimeout(() => {
                    setExpandSeed(false);
                  }, 5 * 1000);
                }
              }
            }}
          >
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 16,
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                borderWidth: 1,
                paddingVertical: 10,
                paddingHorizontal: 20,
                marginVertical: 10,
              }}
            >
              <RegText
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                Copy
              </RegText>
            </View>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 25,
              marginTop: 10,
              marginBottom: 10,
              backgroundColor: colors.secondary,
              width: '100%',
              minWidth: '50%',
              minHeight: 48,
              alignItems: 'center',
              paddingHorizontal: 25,
              paddingVertical: 15,
            }}
          >
            <FadeText
              style={{
                flexGrow: 1,
                flexShrink: 1,
                fontSize: 20,
              }}
            >
              Birthday
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
        </View>
      </ScrollView>
    </ToastProvider>
  );
};

export default Seed;
