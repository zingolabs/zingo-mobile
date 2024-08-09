/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useContext } from 'react';
import { View, SafeAreaView, ScrollView, TouchableOpacity, Text, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Clipboard from '@react-native-community/clipboard';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded, ContextAppLoading } from '../../app/context';
import {
  LanguageEnum,
  NetInfoType,
  ServerType,
  TranslateType,
  WalletType,
  ModeEnum,
  ChainNameEnum,
  SnackbarDurationEnum,
  SeedActionEnum,
  SettingsNameEnum,
  SnackbarType,
  ButtonTypeEnum,
  GlobalConst,
} from '../../app/AppState';
import RPC from '../../app/rpc';
import Header from '../Header';
import Utils from '../../app/utils';
import SettingsFileImpl from '../Settings/SettingsFileImpl';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

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
  action: SeedActionEnum;
  setPrivacyOption: (value: boolean) => Promise<void>;
  keepAwake?: (v: boolean) => void;
};
const Seed: React.FunctionComponent<SeedProps> = ({
  onClickOK,
  onClickCancel,
  action,
  setPrivacyOption,
  keepAwake,
}) => {
  const contextLoaded = useContext(ContextAppLoaded);
  const contextLoading = useContext(ContextAppLoading);
  let wallet: WalletType,
    translate: (key: string) => TranslateType,
    server: ServerType,
    netInfo: NetInfoType,
    privacy: boolean,
    mode: ModeEnum.basic | ModeEnum.advanced,
    addLastSnackbar: (snackbar: SnackbarType) => void,
    language: LanguageEnum;
  if (action === SeedActionEnum.new) {
    wallet = contextLoading.wallet;
    translate = contextLoading.translate;
    server = contextLoading.server;
    netInfo = contextLoading.netInfo;
    privacy = contextLoading.privacy;
    mode = contextLoading.mode;
    addLastSnackbar = contextLoading.addLastSnackbar;
    language = contextLoading.language;
  } else {
    wallet = contextLoaded.wallet;
    translate = contextLoaded.translate;
    server = contextLoaded.server;
    netInfo = contextLoaded.netInfo;
    privacy = contextLoaded.privacy;
    mode = contextLoaded.mode;
    addLastSnackbar = contextLoaded.addLastSnackbar;
    language = contextLoaded.language;
  }

  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [birthdayNumber, setBirthdayNumber] = useState<string>('');
  const [times, setTimes] = useState<number>(0);
  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [expandSeed, setExpandSeed] = useState<boolean>(false);
  const [expandBirthday, setExpandBithday] = useState<boolean>(false);
  const [basicFirstViewSeed, setBasicFirstViewSeed] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      const bfvs: boolean = (await SettingsFileImpl.readSettings()).basicFirstViewSeed;
      setBasicFirstViewSeed(bfvs);
      if (!bfvs && keepAwake) {
        // keep the screen awake while the user is writting the seed
        keepAwake(true);
      }
    })();
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
    setSeedPhrase(wallet.seed || '');
    setBirthdayNumber((wallet.birthday && wallet.birthday.toString()) || '');
  }, [action, wallet.seed, wallet.birthday, wallet, translate]);

  // because this screen is fired from more places than the menu.
  useEffect(() => {
    if (action !== SeedActionEnum.new) {
      (async () => await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false))();
    }
  }, [action]);

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
        (server.chainName !== ChainNameEnum.mainChainName &&
        (action === SeedActionEnum.change || action === SeedActionEnum.server)
          ? '\n' + (translate('seed.mainnet-warning') as string)
          : ''),
      [
        {
          text: translate('confirm') as string,
          onPress: () => {
            onClickOK(seedPhrase, Number(birthdayNumber));
          },
        },
        { text: translate('cancel') as string, onPress: () => onClickCancel(), style: 'cancel' },
      ],
      { cancelable: false, userInterfaceStyle: 'light' },
    );
  };

  //console.log('=================================');
  //console.log(wallet.seed, wallet.birthday);
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
      <Header
        title={translate('seed.title') + ' (' + translate(`seed.${action}`) + ')'}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        setPrivacyOption={setPrivacyOption}
        translate={translate}
        netInfo={netInfo}
        mode={mode}
        addLastSnackbar={addLastSnackbar}
        receivedLegend={action === SeedActionEnum.view ? !basicFirstViewSeed : false}
      />

      <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
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
                  });
                }
                setExpandSeed(true);
                if (privacy) {
                  setTimeout(() => {
                    setExpandSeed(false);
                  }, 5000);
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

        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <FadeText style={{ textAlign: 'center' }}>{translate('seed.birthday-readonly') as string}</FadeText>
          <TouchableOpacity
            onPress={() => {
              if (birthdayNumber) {
                Clipboard.setString(birthdayNumber);
                if (addLastSnackbar) {
                  addLastSnackbar({
                    message: translate('seed.tapcopy-birthday-message') as string,
                    duration: SnackbarDurationEnum.short,
                  });
                }
                setExpandBithday(true);
                if (privacy) {
                  setTimeout(() => {
                    setExpandBithday(false);
                  }, 5000);
                }
              }
            }}>
            <RegText color={colors.text} style={{ textAlign: 'center' }}>
              {!expandBirthday ? Utils.trimToSmall(birthdayNumber, 1) : birthdayNumber}
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
        }}>
        <Button
          testID="seed.button.OK"
          type={mode === ModeEnum.basic ? ButtonTypeEnum.Secondary : ButtonTypeEnum.Primary}
          style={{
            backgroundColor: mode === ModeEnum.basic ? colors.background : colors.primary,
          }}
          title={
            mode === ModeEnum.basic
              ? !basicFirstViewSeed
                ? (translate('seed.showtransactions') as string)
                : (translate('close') as string)
              : !!texts && !!texts[action]
              ? texts[action][times]
              : ''
          }
          onPress={async () => {
            if (!seedPhrase) {
              return;
            }
            // the user just see the seed for the first time.
            if (mode === ModeEnum.basic && !basicFirstViewSeed && keepAwake) {
              await SettingsFileImpl.writeSettings(SettingsNameEnum.basicFirstViewSeed, true);
              keepAwake(false);
            }
            if (times === 0) {
              onClickOK(seedPhrase, Number(birthdayNumber));
            } else if (times === 1) {
              onPressOK();
            }
          }}
        />
        {times > 0 && (
          <Button
            type={ButtonTypeEnum.Secondary}
            title={translate('cancel') as string}
            style={{ marginLeft: 10 }}
            onPress={onClickCancel}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default Seed;
