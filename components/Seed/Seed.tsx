/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
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
import Header from '../Header';
import Utils from '../../app/utils';
import SettingsFileImpl from '../Settings/SettingsFileImpl';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { getRecoveryWalletInfo } from '../../app/recoveryWalletInfov10';
import WalletType from '../../app/AppState/types/WalletType';
import { fetchWallet } from '../../app/walletBackend';

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
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    birthday: birthdayFromContext,
    translate,
    server,
    netInfo,
    privacy,
    mode,
    addLastSnackbar,
    setPrivacyOption,
    recoveryWalletInfoOnDevice,
  } = context;
  const { colors } = useTheme() as ThemeType;
  // when this screen is open from LoadingApp (new wallet)
  // is using the standard modal from react-native
  const screenName = ScreenEnum.Seed;

  const clipboardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [times, setTimes] = useState<number>(0);
  const [texts, setTexts] = useState<TextsType>({} as TextsType);
  const [expandSeed, setExpandSeed] = useState<boolean>(true);
  const [expandBirthday, setExpandBithday] = useState<boolean>(true);
  const [basicFirstViewSeed, setBasicFirstViewSeed] = useState<boolean>(true);
  const [action, setAction] = useState<SeedActionEnum>(
    !!route.params && route.params.action !== undefined
      ? route.params.action
      : SeedActionEnum.view,
  );
  const [fetchedWallet, setFetchedWallet] = useState<WalletType>(
    {} as WalletType,
  );
  const [loadingSeed, setLoadingSeed] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setLoadingSeed(true);
      try {
        const seedInfo = recoveryWalletInfoOnDevice
          ? await getRecoveryWalletInfo()
          : ((await fetchWallet(false)) ?? ({} as WalletType));
        const ufvkInfo = await fetchWallet(true);
        setFetchedWallet({ ...seedInfo, ufvk: ufvkInfo?.ufvk });
      } catch (e) {
        console.log('Error fetching wallet info for seed screen', e);
      } finally {
        setLoadingSeed(false);
      }
    })();
  }, [recoveryWalletInfoOnDevice]);

  const seedPhrase = fetchedWallet.seed || '';
  const ufvk = fetchedWallet.ufvk || '';
  const birthdayNumber =
    (birthdayFromContext && birthdayFromContext.toString()) || '';

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
    const _action =
      !!route.params && route.params.action !== undefined
        ? route.params.action
        : SeedActionEnum.view;
    setAction(_action);
  }, [route, route.params, route.params?.action]);

  useEffect(() => {
    if (keepAwake) {
      (async () => {
        const bfvs: boolean = (await SettingsFileImpl.readSettings())
          .basicFirstViewSeed;
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
      action === SeedActionEnum.change ||
        action === SeedActionEnum.backup ||
        action === SeedActionEnum.server
        ? 1
        : 0,
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
        (server.chainName !== ChainNameEnum.mainChainName &&
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
        {
          text: translate('cancel') as string,
          onPress: () => onClickCancelHide(),
          style: 'cancel',
        },
      ],
      { cancelable: false },
    );
  };

  const onClickCancelHide = () => {
    onClickCancel();
    hiding();
  };

  const onClickOKHide = (
    seedPhraseParm: string,
    birthdayNumberParm: number,
  ) => {
    onClickOK(seedPhraseParm, birthdayNumberParm);
    hiding();
  };

  const hiding = async () => {
    // when this screen is open from LoadingApp (new wallet)
    // is using the standard modal from react-native
    setIsSeedViewModalOpen && setIsSeedViewModalOpen(false);
    // the user just see the seed for the first time.
    if (mode === ModeEnum.basic && !basicFirstViewSeed) {
      await SettingsFileImpl.writeSettings(
        SettingsNameEnum.basicFirstViewSeed,
        true,
      );
      setBasicFirstViewSeed(true);
      keepAwake && keepAwake(false);
      // redirect to history screen
      navigation.navigate(RouteEnum.HomeStack, {
        screen: RouteEnum.History,
      });
    } else {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <Header
        title={
          translate('seed.title') + ' (' + translate(`seed.${action}`) + ')'
        }
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
        receivedLegend={
          action === SeedActionEnum.view ? !basicFirstViewSeed : false
        }
        closeScreen={onClickCancelHide}
      />
      {loadingSeed ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginVertical: 20 }}
        />
      ) : (
        <>
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
              {action === SeedActionEnum.backup ||
              action === SeedActionEnum.change ||
              action === SeedActionEnum.server
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
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
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
            {!!ufvk && (
              <View style={{ marginTop: 10, alignItems: 'center' }}>
                <FadeText style={{ textAlign: 'center' }}>
                  {translate('ufvk.viewkey') as string}
                </FadeText>
                <TouchableOpacity
                  onPress={() => {
                    Clipboard.setString(ufvk);
                    if (addLastSnackbar) {
                      addLastSnackbar(
                        translate('ufvk.tapcopy-message') as string,
                        SnackbarDurationEnum.short,
                      );
                    }
                  }}
                >
                  <RegText color={colors.text} style={{ textAlign: 'center' }}>
                    {Utils.trimToSmall(ufvk, 8)}
                  </RegText>
                </TouchableOpacity>
              </View>
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
            }}
          >
            <Button
              testID="seed.button.ok"
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
        </>
      )}
    </View>
  );
};

export default React.memo(Seed);
