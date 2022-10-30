/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ScrollView, SafeAreaView, Image, TouchableOpacity } from 'react-native';
import RegText from './Components/RegText';
import FadeText from './Components/FadeText';
import BoldText from './Components/BoldText';
import RegTextInput from './Components/RegTextInput';
import ZecAmount from './Components/ZecAmount';
import { parseServerURI, SERVER_URI, MEMOS } from '../app/uris';
import Button from './Button';
import { useTheme } from '@react-navigation/native';
import { WalletSettings } from '../app/AppState';
//import {TouchableOpacity} from 'react-native-gesture-handler';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faDotCircle } from '@fortawesome/free-solid-svg-icons';
import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons';

type SettingsProps = {
  closeModal: () => void;
  wallet_settings: WalletSettings;
  set_wallet_option: (name: string, value: string) => void;
  set_server_option: (server: string) => void;
  totalBalance: object;
  currencyName: string;
};

const Settings: React.FunctionComponent<SettingsProps> = ({
  wallet_settings,
  set_wallet_option,
  set_server_option,
  closeModal,
  totalBalance,
  currencyName,
}) => {
  const { colors } = useTheme();

  const [memos, setMemos] = React.useState(wallet_settings.download_memos);
  const [filter, setFilter] = React.useState(wallet_settings.transaction_filter_threshold);
  const [server, setServer] = React.useState(wallet_settings.server);
  const [error, setError] = React.useState(null);

  const [customIcon, setCustomIcon] = React.useState(null);

  React.useEffect(() => {
    setCustomIcon(SERVER_URI.find(s => s === server) ? farCircle : faDotCircle);
  }, [wallet_settings, server]);

  const saveSettings = async () => {
    if (
      wallet_settings.download_memos === memos &&
      wallet_settings.server === server &&
      wallet_settings.transaction_filter_threshold === filter
    ) {
      setError('No changes registred.');
      setTimeout(() => {
        setError(null);
      }, 5000);
      return;
    }
    if (!memos) {
      setError('You need to choose the download memos option to save.');
      setTimeout(() => {
        setError(null);
      }, 5000);
      return;
    }
    if (!filter) {
      setError('You need to choose the transaction filter threshold option to save.');
      setTimeout(() => {
        setError(null);
      }, 5000);
      return;
    }
    if (!server) {
      setError('You need to choose one Server of the list or fill out a valid Server URI.');
      setTimeout(() => {
        setError(null);
      }, 5000);
      return;
    }
    const result = parseServerURI(server);
    if (result.toLowerCase().startsWith('error')) {
      setError('You need to fill out a valid Server URI.');
      setTimeout(() => {
        setError(null);
      }, 5000);
      return;
    }

    if (wallet_settings.download_memos !== memos) {
      set_wallet_option('download_memos', memos);
    }
    if (wallet_settings.transaction_filter_threshold !== filter) {
      set_wallet_option('transaction_filter_threshold', filter);
    }
    if (wallet_settings.server !== server) {
      set_server_option(server);
    }

    closeModal();
  };

  //console.log(wallet_settings);

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
          source={require('../assets/img/logobig-zingo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain' }}
        />
        <ZecAmount currencyName={currencyName} size={36} amtZec={totalBalance.total} style={{ opacity: 0.4 }} />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          Settings
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </View>

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          backgroundColor: colors.background,
        }}>
        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>SERVER</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          {SERVER_URI.map(uri => (
            <TouchableOpacity
              key={'touch-' + uri}
              style={{ marginRight: 10, marginBottom: 5 }}
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
            <TouchableOpacity style={{ marginRight: 10, marginBottom: 5 }} onPress={() => setServer(null)}>
              <View style={{ display: 'flex', flexDirection: 'row', marginTop: 10 }}>
                {customIcon && <FontAwesomeIcon icon={customIcon} size={20} color={colors.border} />}
                <RegText style={{ marginLeft: 10 }}>custom</RegText>
              </View>
            </TouchableOpacity>

            {customIcon === faDotCircle && (
              <RegTextInput
                placeholder={'... http------.---:--- ...'}
                placeholderTextColor={colors.placeholder}
                style={{
                  //flexGrow: 1,
                  fontSize: 18,
                  width: '60%',
                  borderColor: colors.border,
                  borderWidth: 1,
                  marginLeft: 5,
                  padding: 5,
                  paddingTop: 10,
                  paddingBottom: 10,
                  marginTop: Platform.OS === 'ios' ? 15 : 3,
                }}
                value={server}
                onChangeText={(text: string) => setServer(text)}
              />
            )}
          </View>
        </View>

        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>TRANSACTION FILTER THRESHOLD</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          <RegTextInput
            placeholder={'Number...'}
            placeholderTextColor={colors.placeholder}
            keyboardType="numeric"
            style={{
              //flexGrow: 1,
              fontSize: 18,
              width: '60%',
              borderColor: colors.border,
              borderWidth: 1,
              marginLeft: 5,
              padding: 5,
              paddingTop: 10,
              paddingBottom: 10,
              marginTop: Platform.OS === 'ios' ? 15 : 3,
            }}
            value={filter}
            onChangeText={(text: string) => setFilter(text)}
          />
        </View>

        <View style={{ display: 'flex', margin: 10 }}>
          <BoldText>MEMO DOWNLOAD</BoldText>
        </View>

        <View style={{ display: 'flex', marginLeft: 25 }}>
          {MEMOS.map(memo => (
            <View key={'view-' + memo.value}>
              <TouchableOpacity style={{ marginRight: 10, marginBottom: 5 }} onPress={() => setMemos(memo.value)}>
                <View style={{ display: 'flex', flexDirection: 'row', marginTop: 10 }}>
                  <FontAwesomeIcon
                    icon={memo.value === memos ? faDotCircle : farCircle}
                    size={20}
                    color={colors.border}
                  />
                  <RegText key={'text-' + memo.value} style={{ marginLeft: 10 }}>
                    {memo.value}
                  </RegText>
                </View>
              </TouchableOpacity>
              <FadeText key={'fade-' + memo.value}>{memo.text}</FadeText>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={{ flexGrow: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', margin: 20 }}>
        {error && <FadeText style={{ color: colors.primary }}>{error}</FadeText>}
        <View
          style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 5 }}>
          <Button type="Primary" title="Save" style={{ marginLeft: 10 }} onPress={saveSettings} />
          <Button type="Secondary" title="Close" style={{ marginLeft: 10 }} onPress={closeModal} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Settings;
