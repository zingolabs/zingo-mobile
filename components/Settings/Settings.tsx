/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView, Image, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faDotCircle } from '@fortawesome/free-solid-svg-icons';
import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons';
import Toast from 'react-native-simple-toast';

import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import ZecAmount from '../Components/ZecAmount';
import { parseServerURI, serverUris } from '../../app/uris';
import Button from '../Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import ZingoHeader from '../ZingoHeader';

type SettingsProps = {
  closeModal: () => void;
  set_wallet_option: (name: string, value: string) => Promise<void>;
  set_server_option: (name: 'server' | 'currency' | 'language' | 'sendAll', value: string) => Promise<void>;
  set_currency_option: (name: 'server' | 'currency' | 'language' | 'sendAll', value: string) => Promise<void>;
  set_language_option: (
    name: 'server' | 'currency' | 'language' | 'sendAll',
    value: string,
    reset: boolean,
  ) => Promise<void>;
  set_sendAll_option: (name: 'server' | 'currency' | 'language' | 'sendAll', value: boolean) => Promise<void>;
};

type Options = {
  value: string;
  text: string;
};

const Settings: React.FunctionComponent<SettingsProps> = ({
  set_wallet_option,
  set_server_option,
  set_currency_option,
  set_language_option,
  set_sendAll_option,
  closeModal,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    walletSettings,
    totalBalance,
    info,
    translate,
    server: serverContext,
    currency: currencyContext,
    language: languageContext,
    sendAll: sendAllContext,
  } = context;

  const memosArray: string = translate('settings.memos');
  let MEMOS: Options[] = [];
  if (typeof memosArray === 'object') {
    MEMOS = memosArray as Options[];
  }

  const currenciesArray: string = translate('settings.currencies');
  let CURRENCIES: Options[] = [];
  if (typeof currenciesArray === 'object') {
    CURRENCIES = currenciesArray as Options[];
  }

  const languagesArray: string = translate('settings.languages');
  let LANGUAGES: Options[] = [];
  if (typeof languagesArray === 'object') {
    LANGUAGES = languagesArray as Options[];
  }

  const sendAllsArray: string = translate('settings.sendalls');
  let SENDALLS: Options[] = [];
  if (typeof sendAllsArray === 'object') {
    SENDALLS = sendAllsArray as Options[];
  }

  const { colors } = useTheme() as unknown as ThemeType;

  const [memos, setMemos] = useState(walletSettings.download_memos);
  const [filter, setFilter] = useState(walletSettings.transaction_filter_threshold);
  const [server, setServer] = useState(serverContext);
  const [currency, setCurrency] = useState(currencyContext);
  const [language, setLanguage] = useState(languageContext);
  const [sendAll, setSendAll] = useState(sendAllContext);
  const [customIcon, setCustomIcon] = useState(farCircle);

  moment.locale(language);

  useEffect(() => {
    setCustomIcon(serverUris().find((s: string) => s === server) ? farCircle : faDotCircle);
  }, [server]);

  const saveSettings = async () => {
    if (
      walletSettings.download_memos === memos &&
      walletSettings.transaction_filter_threshold === filter &&
      serverContext === server &&
      currencyContext === currency &&
      languageContext === language &&
      sendAllContext === sendAll
    ) {
      Toast.show(translate('settings.nochanges'), Toast.LONG);
      return;
    }
    if (!memos) {
      Toast.show(translate('settings.ismemo'), Toast.LONG);
      return;
    }
    if (!filter) {
      Toast.show(translate('settings.isthreshold'), Toast.LONG);
      return;
    }
    if (!server) {
      Toast.show(translate('settings.isserver'), Toast.LONG);
      return;
    }
    if (!language) {
      Toast.show(translate('settings.islanguage'), Toast.LONG);
      return;
    }
    const result = parseServerURI(server);
    if (result.toLowerCase().startsWith('error')) {
      Toast.show(translate('settings.isuri'), Toast.LONG);
      return;
    }

    if (walletSettings.download_memos !== memos) {
      await set_wallet_option('download_memos', memos);
    }
    if (walletSettings.transaction_filter_threshold !== filter) {
      await set_wallet_option('transaction_filter_threshold', filter);
    }
    if (currencyContext !== currency) {
      await set_currency_option('currency', currency);
    }
    if (sendAllContext !== sendAll) {
      await set_sendAll_option('sendAll', sendAll);
    }
    // the last one
    if (serverContext !== server) {
      if (languageContext !== language) {
        await set_language_option('language', language, false);
      }
      set_server_option('server', server);
    } else {
      if (languageContext !== language) {
        await set_language_option('language', language, true);
      }
    }

    closeModal();
  };

  const optionsRadio = (
    DATA: Options[],
    setOption: React.Dispatch<React.SetStateAction<string | boolean>>,
    typeOption: StringConstructor | BooleanConstructor,
    valueOption: string | boolean,
  ) => {
    return DATA.map(item => (
      <View key={'view-' + item.value}>
        <TouchableOpacity
          style={{ marginRight: 10, marginBottom: 5, maxHeight: 50, minHeight: 48 }}
          onPress={() => setOption(typeOption(item.value))}>
          <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <FontAwesomeIcon
              icon={typeOption(item.value) === valueOption ? faDotCircle : farCircle}
              size={20}
              color={colors.border}
            />
            <RegText key={'text-' + item.value} style={{ marginLeft: 10 }}>
              {translate(`settings.value-${item.value}`)}
            </RegText>
          </View>
        </TouchableOpacity>
        <FadeText key={'fade-' + item.value}>{item.text}</FadeText>
      </View>
    ));
  };

  //console.log(walletSettings);

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <ZingoHeader>
        <ZecAmount
          currencyName={info.currencyName ? info.currencyName : ''}
          size={36}
          amtZec={totalBalance.total}
          style={{ opacity: 0.5 }}
        />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          {translate('settings.title')}
        </RegText>
      </ZingoHeader>

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>{translate('settings.sendall-title')}</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          {optionsRadio(
            SENDALLS,
            setSendAll as React.Dispatch<React.SetStateAction<string | boolean>>,
            Boolean,
            sendAll,
          )}
        </View>

        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>{translate('settings.currency-title')}</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          {optionsRadio(
            CURRENCIES,
            setCurrency as React.Dispatch<React.SetStateAction<string | boolean>>,
            String,
            currency,
          )}
        </View>

        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>{translate('settings.language-title')}</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          {optionsRadio(
            LANGUAGES,
            setLanguage as React.Dispatch<React.SetStateAction<string | boolean>>,
            String,
            language,
          )}
        </View>

        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>{translate('settings.server-title')}</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          {serverUris().map((uri: string) => (
            <TouchableOpacity
              key={'touch-' + uri}
              style={{ marginRight: 10, marginBottom: 5, maxHeight: 50, minHeight: 48 }}
              onPress={() => setServer(uri)}>
              <View style={{ display: 'flex', flexDirection: 'row', marginTop: 10 }}>
                <FontAwesomeIcon icon={uri === server ? faDotCircle : farCircle} size={20} color={colors.border} />
                <RegText key={'tex-' + uri} style={{ marginLeft: 10 }}>
                  {uri}
                </RegText>
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ display: 'flex', flexDirection: 'row' }}>
            <TouchableOpacity
              style={{ marginRight: 10, marginBottom: 5, maxHeight: 50, minHeight: 48 }}
              onPress={() => setServer('')}>
              <View style={{ display: 'flex', flexDirection: 'row', marginTop: 10 }}>
                {customIcon && <FontAwesomeIcon icon={customIcon} size={20} color={colors.border} />}
                <RegText style={{ marginLeft: 10 }}>{translate('settings.custom')}</RegText>
              </View>
            </TouchableOpacity>

            {customIcon === faDotCircle && (
              <View
                accessible={true}
                accessibilityLabel={translate('settings.server-acc')}
                style={{
                  borderColor: colors.border,
                  borderWidth: 1,
                  marginLeft: 5,
                  width: 'auto',
                  maxWidth: '80%',
                  maxHeight: 48,
                  minWidth: '50%',
                  minHeight: 48,
                }}>
                <TextInput
                  placeholder={'... http------.---:--- ...'}
                  placeholderTextColor={colors.placeholder}
                  style={{
                    color: colors.text,
                    fontWeight: '600',
                    fontSize: 18,
                    minWidth: '50%',
                    minHeight: 48,
                    marginLeft: 5,
                  }}
                  value={server}
                  onChangeText={(text: string) => setServer(text)}
                  editable={true}
                  maxLength={100}
                />
              </View>
            )}
          </View>
        </View>

        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>{translate('settings.threshold-title')}</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          <View
            accessible={true}
            accessibilityLabel={translate('settings.threshold-acc')}
            style={{
              borderColor: colors.border,
              borderWidth: 1,
              marginLeft: 5,
              width: 'auto',
              maxWidth: '60%',
              maxHeight: 48,
              minWidth: '30%',
              minHeight: 48,
            }}>
            <TextInput
              placeholder={translate('settings.number')}
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              style={{
                color: colors.text,
                fontWeight: '600',
                fontSize: 18,
                minWidth: '30%',
                minHeight: 48,
                marginLeft: 5,
              }}
              value={filter}
              onChangeText={(text: string) => setFilter(text)}
              editable={true}
              maxLength={6}
            />
          </View>
        </View>

        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>{translate('settings.memo-title')}</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25, marginBottom: 30 }}>
          {optionsRadio(MEMOS, setMemos as React.Dispatch<React.SetStateAction<string | boolean>>, String, memos)}
        </View>
      </ScrollView>
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button type="Primary" title={translate('settings.save')} onPress={saveSettings} />
        <Button type="Secondary" title={translate('cancel')} style={{ marginLeft: 10 }} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default Settings;
