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
  ModeEnum,
  SnackbarDurationEnum,
  SettingsNameEnum,
  ScreenEnum,
  RouteEnum,
} from '../../app/AppState';
import Utils from '../../app/utils';
import SettingsFileImpl from '../Settings/SettingsFileImpl';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';

type SeedProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Seed> & {
  onClickOK?: (seedPhrase: string, birthdayNumber: number) => void;
  onClickCancel?: () => void;
  keepAwake?: (v: boolean) => void;
  setIsSeedViewModalOpen?: (v: boolean) => void;
};
const Seed: React.FunctionComponent<SeedProps> = ({
  onClickCancel,
  keepAwake,
  setIsSeedViewModalOpen,
}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    wallet,
    translate,
    privacy,
    mode,
    addLastSnackbar,
    snackbars,
    removeFirstSnackbar,
  } = context;
  const { colors } = useTheme()  as ThemeType;
  // when this screen is open from LoadingApp (new wallet) 
  // is using the standard modal from react-native
  const { clear } = useToast();
  const screenName = ScreenEnum.Seed;

  const SEED_LENGTH = 24;

  const [rows, setRows] = useState<string[][]>([]);

  const insets = useSafeAreaInsets();

  const maxW = 520; //tablets -> landscape. 

  const [expandSeed, setExpandSeed] = useState<boolean>(true);
  const [expandBirthday, setExpandBithday] = useState<boolean>(true);
  const [basicFirstViewSeed, setBasicFirstViewSeed] = useState<boolean>(true);
  
  const seedPhrase = wallet.seed || '';
  const birthdayNumber = (wallet.birthday && wallet.birthday.toString()) || '';

  useEffect(() => {
    const seedTextArray: string[] = seedPhrase
      .split(' ');

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
    if (keepAwake) {
      (async () => {
        const bfvs: boolean = (await SettingsFileImpl.readSettings()).basicFirstViewSeed;
        setBasicFirstViewSeed(bfvs);
        if (!bfvs) {
          // keep the screen awake while the user is writting the seed
          keepAwake(true);
        }
      })();
    }
  }, [keepAwake]);

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
    onClickCancel && onClickCancel();
    clear();
    hiding();
  };

  const hiding = async () => {
    // when this screen is open from LoadingApp (new wallet)
    // is using the standard modal from react-native
    setIsSeedViewModalOpen && setIsSeedViewModalOpen(false);
    // the user just see the seed for the first time.
    if (mode === ModeEnum.basic && !basicFirstViewSeed) {
      await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, true);
      setBasicFirstViewSeed(true);
      keepAwake && keepAwake(false);
      // redirect to history screen
      navigation.navigate(RouteEnum.MainTabs, { screen: RouteEnum.History });
    } else {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
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

      <HeaderTitle title='Seed phrase' goBack={() => {
        onClickCancelHide();
      }} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 10,
      }}>
        <View
          style={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
        }}>

          <FadeText style={{ padding: 10, textAlign: 'center', fontSize: 17 }}>
            {'Your seed phrase is the key to your wallet. Back it up so you can restore your wallet if you lose or damage your device '}
          </FadeText>

          {rows.length > 0 && (
            <View style={{ marginTop: 10 }}>
              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={{ flexDirection: 'row', gap: 8 }}>
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
                          marginBottom: 10,
                          backgroundColor: colors.secondary,
                          width: '30%',
                          maxWidth: maxW,
                          minWidth: '30%',
                          minHeight: 48,
                          alignItems: 'center',
                          paddingHorizontal: 15,
                          paddingVertical: 0,
                        }}>
                        <FadeText>{`${index + 1}`}.</FadeText>
                        <TextInput
                          style={{
                            flexGrow: 1,
                            flexShrink: 1,
                            color: colors.text,
                            fontWeight: '600',
                            fontSize: 15,
                            minHeight: 48,
                            marginLeft: 5,
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
              {true && (
                <TouchableOpacity 
                  style={{ alignSelf: 'flex-end' }}
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
                  }}>
                  <View 
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '30%',
                      height: 30,
                      padding: 0,
                  }}>
                    <RegText style={{ color: colors.primary, textDecorationStyle: 'solid', textDecorationLine: 'underline' }}>Copy</RegText>
                  </View>
                </TouchableOpacity>
              ) }
            </View>
          )}

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
                maxWidth: maxW,
                minWidth: '50%',
                minHeight: 48,
                alignItems: 'center',
                paddingHorizontal: 25,
                paddingVertical: 15,
              }}>
              <FadeText 
                style={{ 
                  flexGrow: 1,
                  flexShrink: 1,
                  fontSize: 20, 
              }}>
                Birthday
              </FadeText>
            <TouchableOpacity
              onPress={() => {
                if (birthdayNumber) {
                  Clipboard.setString(birthdayNumber);
                  if (addLastSnackbar) {
                    addLastSnackbar({
                      message: translate('seed.tapcopy-birthday-message') as string,
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
              }}>
              <RegText color={colors.text} style={{ textAlign: 'center' }}>
                {!expandBirthday ? Utils.trimToSmall(birthdayNumber, 1) : birthdayNumber}
              </RegText>
            </TouchableOpacity>
            </View>
        </View>
      </ScrollView>
    </ToastProvider>
  );
};

export default Seed;
