/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useContext } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Alert } from 'react-native';

import { useNavigation, useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import {
  ModeEnum,
  ChainNameEnum,
  SnackbarDurationEnum,
  SeedActionEnum,
  SettingsNameEnum,
  ButtonTypeEnum,
  ScreenEnum,
  RouteEnum,
} from '../../app/AppState';
import Utils from '../../app/utils';
import SettingsFileImpl from '../Settings/SettingsFileImpl';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type SeedProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Seed> & {
  onClickOK: (seedPhrase: string, birthdayNumber: number) => void;
  onClickCancel: () => void;
  keepAwake?: (v: boolean) => void;
  setIsSeedViewModalOpen?: (v: boolean) => void;
};
const Seed: React.FunctionComponent<SeedProps> = ({
  route,
  onClickOK,
  onClickCancel,
  keepAwake,
  setIsSeedViewModalOpen,
}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    wallet,
    translate,
    indexerServer,
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

  const insets = useSafeAreaInsets();

  const [times, setTimes] = useState<number>(0);
  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [expandSeed, setExpandSeed] = useState<boolean>(true);
  const [expandBirthday, setExpandBithday] = useState<boolean>(true);
  const [basicFirstViewSeed, setBasicFirstViewSeed] = useState<boolean>(true);
  const [action, setAction] = useState<SeedActionEnum>(!!route.params && route.params.action !== undefined ? route.params.action : SeedActionEnum.view);

  const seedPhrase = wallet.seed || '';
  const birthdayNumber = (wallet.birthday && wallet.birthday.toString()) || '';

  useEffect(() => {
    const _action = !!route.params && route.params.action !== undefined ? route.params.action : SeedActionEnum.view;
    setAction(_action);
  }, [
    route, 
    route.params, 
    route.params?.action
  ]);

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

  useEffect(() => {
    const buttonTextsArray = translate('seed.buttontexts');
    let buttonTexts = {} as TextsType;
    if (typeof buttonTextsArray === 'object') {
      buttonTexts = buttonTextsArray as TextsType;
      setTexts(buttonTexts);
    }
    setTimes(
      action === SeedActionEnum.change || action === SeedActionEnum.backup || action === SeedActionEnum.server ? 1 : 0,
    );
  }, [action, translate]);

  const onPressOK = () => {
    Alert.alert(
      !!texts && !!texts[action] ? texts[action][3] : '',
      (action === SeedActionEnum.change
        ? (translate('seed.change-warning') as string)
        : action === SeedActionEnum.backup
        ? (translate('seed.backup-warning') as string)
        : action === SeedActionEnum.server
        ? (translate('seed.server-warning') as string)
        : '') +
        (indexerServer.chainName !== ChainNameEnum.mainChainName &&
        (action === SeedActionEnum.change || action === SeedActionEnum.server)
          ? '\n' + (translate('seed.mainnet-warning') as string)
          : ''),
      [
        {
          text: translate('confirm') as string,
          onPress: () => {
            onClickOKHide(seedPhrase, Number(birthdayNumber));
          },
        },
        { text: translate('cancel') as string, onPress: () => onClickCancelHide(), style: 'cancel' },
      ],
      { cancelable: false },
    );
  };

  const onClickCancelHide = () => {
    onClickCancel();
    clear();
    hiding();
  };

  const onClickOKHide = (seedPhraseParm: string, birthdayNumberParm: number) => {
    onClickOK(seedPhraseParm, birthdayNumberParm);
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
      navigation.navigate(RouteEnum.History);
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

      <View style={{
        position: 'absolute',
        width: 75,
        top: 10,
        left: 10,
        zIndex: 999,
      }}>
        <View
          style={{
            borderRadius: 25,
            borderColor: colors.text,
            borderWidth: 1,
            padding: 10,
            margin: 10,
            backgroundColor: colors.background,
          }}>
            <TouchableOpacity onPress={() => {
              onClickCancelHide();
            }}>
              <FontAwesomeIcon
                size={30}
                icon={faChevronLeft}
                color={colors.text}
              />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 16,
      }}>
        <View
          style={{
            flexGrow: 1,
            alignItems: 'flex-start',
            justifyContent: 'center',
        }}>

          <RegText color={colors.text} style={{ fontSize: 30, alignSelf: 'center' }}>Wallet Seed Phrase</RegText>

          <RegText style={{ marginTop: 0, padding: 20, textAlign: 'center', fontWeight: '900' }}>
            {action === SeedActionEnum.backup || action === SeedActionEnum.change || action === SeedActionEnum.server
              ? (translate(`seed.text-readonly-${action}`) as string)
              : (translate('seed.text-readonly') as string)}
          </RegText>
          <View
            style={{
              margin: 10,
              padding: 10,
              borderWidth: 1,
              borderRadius: 10,
              borderColor: colors.text,
              maxHeight: '45%',
            }}>
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
              }}>
              <RegText
                color={colors.text}
                style={{
                  textAlign: 'center',
                }}>
                {!expandSeed ? Utils.trimToSmall(seedPhrase, 5) : seedPhrase}
              </RegText>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View />
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
                  {translate('seed.tapcopy') as string}
                </Text>
              </TouchableOpacity>
              <View />
            </View>
          </View>

          <View style={{ marginTop: 10, alignItems: 'center', alignSelf: 'center' }}>
            <FadeText style={{ textAlign: 'center' }}>{translate('seed.birthday-readonly') as string}</FadeText>
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
          <View style={{ marginBottom: 30 }} />
        </View>
      </ScrollView>
      <View
        style={{
          marginTop: 'auto',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 10,
          paddingBottom: 20,
        }}>
        <Button
          testID="seed.button.ok"
          type={mode === ModeEnum.basic ? ButtonTypeEnum.Secondary : ButtonTypeEnum.Primary}
          style={{
            backgroundColor: mode === ModeEnum.basic ? colors.background : colors.primary,
          }}
          title={
            mode === ModeEnum.basic
              ? !basicFirstViewSeed
                ? (translate('seed.showtransactions') as string)
                : (translate('cancel') as string)
              : !!texts && !!texts[action]
              ? texts[action][times]
              : ''
          }
          onPress={async () => {
            if (!seedPhrase) {
              return;
            }
            if (times === 0) {
              onClickOKHide(seedPhrase, Number(birthdayNumber));
            } else if (times === 1) {
              onPressOK();
            }
          }}
        />
      </View>
    </ToastProvider>
  );
};

export default Seed;
