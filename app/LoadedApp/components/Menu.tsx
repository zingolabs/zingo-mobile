/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ScrollView, View, Text, Dimensions } from 'react-native';

import RegText from '../../../components/Components/RegText';

import { useTheme } from '@react-navigation/native';
import { ContextAppLoaded } from '../../context';
import RPC from '../../rpc';
import { ThemeType } from '../../types';
import simpleBiometrics from '../../simpleBiometrics';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { MenuItemEnum, ModeEnum } from '../../AppState';

type MenuProps = {
  onItemSelected: (item: MenuItemEnum) => Promise<void>;
  updateMenuState: (isOpen: boolean) => void;
};

const Menu: React.FunctionComponent<MenuProps> = ({ onItemSelected, updateMenuState }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, readOnly, mode, transactions, addLastSnackbar, security, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const dimensions = {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  };

  const item = {
    fontSize: 14,
    // for small screens -> trying to avoid the scroll.
    paddingTop: dimensions.height < 475 ? 20 : 25,
  };

  const onItemSelectedWrapper = async (value: MenuItemEnum) => {
    if (
      (value === MenuItemEnum.WalletSeedUfvk && !readOnly && security.seedScreen) ||
      (value === MenuItemEnum.WalletSeedUfvk && readOnly && security.ufvkScreen) ||
      (value === MenuItemEnum.Rescan && security.rescanScreen) ||
      (value === MenuItemEnum.Settings && security.settingsScreen) ||
      (value === MenuItemEnum.ChangeWallet && security.changeWalletScreen) ||
      (value === MenuItemEnum.RestoreWalletBackup && security.restoreWalletBackupScreen)
    ) {
      const resultBio = await simpleBiometrics({ translate: translate });
      // can be:
      // - true      -> the user do pass the authentication
      // - false     -> the user do NOT pass the authentication
      // - undefined -> no biometric authentication available -> Passcode.
      console.log('BIOMETRIC --------> ', resultBio);
      if (resultBio === false) {
        // snack with Error & closing the menu.
        updateMenuState(false);
        addLastSnackbar({ message: translate('biometrics-error') as string });
      } else {
        // if the user click on a screen in the menu the sync is going to continue
        (async () => await RPC.rpc_setInterruptSyncAfterBatch('false'))();
        onItemSelected(value);
      }
    } else {
      // if the user click on a screen in the menu the sync is going to continue
      // or if the security check of the screen is false in settings
      (async () => await RPC.rpc_setInterruptSyncAfterBatch('false'))();
      onItemSelected(value);
    }
  };

  return (
    <View style={{ height: '100%' }}>
      <ScrollView
        scrollsToTop={false}
        style={{
          flex: 1,
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: '#010101',
        }}
        contentContainerStyle={{ display: 'flex' }}>
        <RegText color={colors.money} style={{ marginVertical: 10, marginLeft: 30 }}>
          {translate('loadedapp.options') as string}
        </RegText>
        <View style={{ height: 1, backgroundColor: colors.primary }} />

        <View style={{ display: 'flex', marginLeft: 20 }}>
          <RegText onPress={() => onItemSelectedWrapper(MenuItemEnum.About)} style={item}>
            {translate('loadedapp.about') as string}
          </RegText>

          {mode !== ModeEnum.basic && (
            <RegText onPress={() => onItemSelectedWrapper(MenuItemEnum.Info)} style={item}>
              {translate('loadedapp.info') as string}
            </RegText>
          )}

          <RegText testID="menu.settings" onPress={() => onItemSelectedWrapper(MenuItemEnum.Settings)} style={item}>
            {translate('loadedapp.settings') as string}
          </RegText>

          <RegText
            testID="menu.addressbook"
            onPress={() => onItemSelectedWrapper(MenuItemEnum.AddressBook)}
            style={item}>
            {translate('loadedapp.addressbook') as string}
          </RegText>

          {!(mode === ModeEnum.basic && transactions.length <= 0) && (
            <RegText onPress={() => onItemSelectedWrapper(MenuItemEnum.WalletSeedUfvk)} style={item}>
              {readOnly
                ? mode === ModeEnum.basic
                  ? (translate('loadedapp.walletufvk-basic') as string)
                  : (translate('loadedapp.walletufvk') as string)
                : mode === ModeEnum.basic
                ? (translate('loadedapp.walletseed-basic') as string)
                : (translate('loadedapp.walletseed') as string)}
            </RegText>
          )}

          {mode !== ModeEnum.basic && (
            <RegText onPress={() => onItemSelectedWrapper(MenuItemEnum.Rescan)} style={item}>
              {translate('loadedapp.rescanwallet') as string}
            </RegText>
          )}

          {mode !== ModeEnum.basic && (
            <RegText
              testID="menu.syncreport"
              onPress={() => onItemSelectedWrapper(MenuItemEnum.SyncReport)}
              style={item}>
              {translate('loadedapp.report') as string}
            </RegText>
          )}

          {mode !== ModeEnum.basic && (
            <RegText
              testID="menu.fund-pools"
              onPress={() => onItemSelectedWrapper(MenuItemEnum.FundPools)}
              style={item}>
              {translate('loadedapp.fundpools') as string}
            </RegText>
          )}

          {!(mode === ModeEnum.basic && transactions.length <= 0) && (
            <RegText onPress={() => onItemSelectedWrapper(MenuItemEnum.Insight)} style={item}>
              {translate('loadedapp.insight') as string}
            </RegText>
          )}

          {mode !== ModeEnum.basic && (
            <RegText
              testID="menu.changewallet"
              onPress={() => onItemSelectedWrapper(MenuItemEnum.ChangeWallet)}
              style={item}>
              {translate('loadedapp.changewallet') as string}
            </RegText>
          )}

          {mode !== ModeEnum.basic && (
            <RegText onPress={() => onItemSelectedWrapper(MenuItemEnum.RestoreWalletBackup)} style={item}>
              {translate('loadedapp.restorebackupwallet') as string}
            </RegText>
          )}
          {mode === ModeEnum.basic && transactions.length === 0 && (
            <RegText onPress={() => onItemSelectedWrapper(MenuItemEnum.LoadWalletFromSeed)} style={item}>
              {translate('loadedapp.loadwalletfromseed-basic') as string}
            </RegText>
          )}
          {mode === ModeEnum.basic && (
            <RegText onPress={() => onItemSelectedWrapper(MenuItemEnum.TipZingoLabs)} style={item}>
              {translate('loadedapp.tipzingolabs-basic') as string}
            </RegText>
          )}
        </View>
      </ScrollView>
      <View
        style={{
          padding: 10,
          position: 'absolute',
          bottom: 5,
          flexDirection: 'row',
          backgroundColor: '#010101',
        }}>
        <Text style={{ fontSize: 8, color: colors.border }}>Version : </Text>
        <Text style={{ fontSize: 8, color: colors.primaryDisabled }}>{translate('version') as string}</Text>
        <Text style={{ fontSize: 8, color: colors.border, marginLeft: 10 }}>{`${translate('settings.mode')}${translate(
          `settings.value-mode-${mode}`,
        )}`}</Text>
      </View>
    </View>
  );
};

export default Menu;
