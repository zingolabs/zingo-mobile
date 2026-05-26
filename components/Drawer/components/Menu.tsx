/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Dimensions, Image, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { advancedTheme, basicTheme } from '../../../App';

import RegText from '../../../components/Components/RegText';

import { useTheme } from '@react-navigation/native';
import { ContextAppLoaded } from '../../../app/context';
import { ThemeType } from '../../../app/types';
import simpleBiometrics from '../../../app/simpleBiometrics';
import { getZingoName, getZingoVersion } from '../../../app/utils/ZingoAppData';
import {
  GlobalConst,
  MenuItemEnum,
  ModeEnum,
  ScreenEnum,
  SelectServerEnum,
} from '../../../app/AppState';
import RPCModule from '../../../app/RPCModule';
import {
  DrawerContentScrollView,
  useDrawerStatus,
} from '@react-navigation/drawer';

type MenuProps = {
  onItemSelected: (item: MenuItemEnum) => void;
  screenName: ScreenEnum;
  toggleMenuDrawer: () => void;
};

const Menu: React.FunctionComponent<MenuProps> = ({
  onItemSelected,
  toggleMenuDrawer,
}) => {
  const [hasBackupWallet, setHasBackupWallet] = useState(false);
  const drawerStatus = useDrawerStatus();

  useEffect(() => {
    const checkBackup = async () => {
      const exists = await RPCModule.walletBackupExists();
      setHasBackupWallet(!!exists && exists !== GlobalConst.false);
    };
    checkBackup();
  }, [drawerStatus]);

  const context = useContext(ContextAppLoaded);
  const {
    translate,
    readOnly,
    mode,
    setModeOption,
    valueTransfersTotal,
    addLastSnackbar,
    security,
    rescanMenu,
    selectServer,
    netInfo,
  } = context;
  const { colors } = useTheme() as ThemeType;

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  const item = {
    fontSize: 14,
    // for small screens -> trying to avoid the scroll.
    paddingTop: dimensions.height < 475 ? 20 : 25,
  };

  const onItemSelectedWrapper = async (value: MenuItemEnum) => {
    toggleMenuDrawer();
    if (
      (value === MenuItemEnum.WalletSeedUfvk && security.seedUfvkScreen) ||
      (value === MenuItemEnum.Rescan && security.rescanScreen) ||
      (value === MenuItemEnum.ChangeWallet && security.changeWalletScreen) ||
      (value === MenuItemEnum.RestoreWalletBackup &&
        security.restoreWalletBackupScreen)
    ) {
      const resultBio = await simpleBiometrics({ translate: translate });
      // can be:
      // - true      -> the user do pass the authentication
      // - false     -> the user do NOT pass the authentication
      // - undefined -> no biometric authentication available -> Passcode.
      //console.log('BIOMETRIC --------> ', resultBio);
      if (resultBio === false) {
        // snack with Error & closing the menu.
        addLastSnackbar(translate('biometrics-error') as string);
      } else {
        // the App/Drawer needs a bit of time to close
        // properly
        onItemSelected(value);
      }
    } else {
      // the App/Drawer needs a bit of time to close
      // properly
      onItemSelected(value);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.sideMenuBackground,
        alignItems: 'stretch',
      }}
    >
      <DrawerContentScrollView
        scrollsToTop={false}
        style={{
          backgroundColor: colors.sideMenuBackground,
        }}
      >
        <RegText
          color={colors.money}
          style={{ marginVertical: 10, marginLeft: 30 }}
        >
          {translate('loadedapp.options') as string}
        </RegText>
        <View style={{ height: 1, backgroundColor: colors.primary }} />

        <View style={{ display: 'flex', marginLeft: 20 }}>
          <RegText
            testID="menu.about"
            onPress={() => onItemSelectedWrapper(MenuItemEnum.About)}
            style={item}
          >
            {translate('loadedapp.about') as string}
          </RegText>

          {mode !== ModeEnum.basic &&
            selectServer !== SelectServerEnum.offline && (
              <RegText
                testID="menu.info"
                onPress={() => onItemSelectedWrapper(MenuItemEnum.Info)}
                style={item}
              >
                {translate('loadedapp.info') as string}
              </RegText>
            )}

          <RegText
            testID="menu.addressbook"
            onPress={() => onItemSelectedWrapper(MenuItemEnum.AddressBook)}
            style={item}
          >
            {translate('loadedapp.addressbook') as string}
          </RegText>

          {!(
            mode === ModeEnum.basic &&
            valueTransfersTotal !== null &&
            valueTransfersTotal === 0
          ) && (
            <RegText
              testID="menu.walletseedufvk"
              onPress={() => onItemSelectedWrapper(MenuItemEnum.WalletSeedUfvk)}
              style={item}
            >
              {readOnly
                ? mode === ModeEnum.basic
                  ? (translate('loadedapp.walletufvk-basic') as string)
                  : (translate('loadedapp.walletufvk') as string)
                : mode === ModeEnum.basic
                  ? (translate('loadedapp.walletseed-basic') as string)
                  : (translate('loadedapp.walletseed') as string)}
            </RegText>
          )}

          {mode !== ModeEnum.basic &&
            rescanMenu &&
            selectServer !== SelectServerEnum.offline && (
              <RegText
                testID="menu.rescan"
                onPress={() => onItemSelectedWrapper(MenuItemEnum.Rescan)}
                style={item}
              >
                {translate('loadedapp.rescanwallet') as string}
              </RegText>
            )}

          {mode !== ModeEnum.basic &&
            selectServer !== SelectServerEnum.offline && (
              <RegText
                testID="menu.syncreport"
                onPress={() => onItemSelectedWrapper(MenuItemEnum.SyncReport)}
                style={item}
              >
                {translate('loadedapp.report') as string}
              </RegText>
            )}

          {mode !== ModeEnum.basic && (
            <RegText
              testID="menu.fundpools"
              onPress={() => onItemSelectedWrapper(MenuItemEnum.FundPools)}
              style={item}
            >
              {translate('loadedapp.fundpools') as string}
            </RegText>
          )}

          {!(
            mode === ModeEnum.basic &&
            valueTransfersTotal !== null &&
            valueTransfersTotal === 0
          ) && (
            <RegText
              testID="menu.insight"
              onPress={() => onItemSelectedWrapper(MenuItemEnum.Insight)}
              style={item}
            >
              {translate('loadedapp.insight') as string}
            </RegText>
          )}

          {mode !== ModeEnum.basic &&
            netInfo.isConnected &&
            selectServer !== SelectServerEnum.offline && (
              <RegText
                testID="menu.changewallet"
                onPress={() => onItemSelectedWrapper(MenuItemEnum.ChangeWallet)}
                style={item}
              >
                {translate('loadedapp.changewallet') as string}
              </RegText>
            )}

          {mode !== ModeEnum.basic && hasBackupWallet && (
            <RegText
              testID="menu.restorebackupwallet"
              onPress={() =>
                onItemSelectedWrapper(MenuItemEnum.RestoreWalletBackup)
              }
              style={item}
            >
              {translate('loadedapp.restorebackupwallet') as string}
            </RegText>
          )}
          {mode === ModeEnum.basic &&
            valueTransfersTotal !== null &&
            valueTransfersTotal === 0 &&
            netInfo.isConnected &&
            selectServer !== SelectServerEnum.offline && (
              <RegText
                testID="menu.loadwalletfromseed"
                onPress={() =>
                  onItemSelectedWrapper(MenuItemEnum.LoadWalletFromSeed)
                }
                style={item}
              >
                {translate('loadedapp.loadwalletfromseed-basic') as string}
              </RegText>
            )}
          {mode === ModeEnum.basic &&
            !readOnly &&
            selectServer !== SelectServerEnum.offline && (
              <RegText
                testID="menu.tipzingolabs"
                onPress={() => onItemSelectedWrapper(MenuItemEnum.TipZingoLabs)}
                style={item}
              >
                {translate('loadedapp.tipzingolabs-basic') as string}
              </RegText>
            )}
          <RegText
            onPress={() => onItemSelectedWrapper(MenuItemEnum.Support)}
            style={item}
          >
            {translate('loadedapp.support') as string}
          </RegText>
        </View>
      </DrawerContentScrollView>
      <View
        style={{
          paddingHorizontal: 15,
          paddingBottom: 0,
          paddingTop: 10,
          backgroundColor: colors.sideMenuBackground,
        }}
      >
        <TouchableOpacity
          onPress={() =>
            setModeOption(
              mode === ModeEnum.basic ? ModeEnum.advanced : ModeEnum.basic,
            )
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.zingo,
            borderRadius: 10,
            padding: 10,
          }}
        >
          <Image
            source={require('../../../assets/img/logobig-zingo.png')}
            style={{
              width: 32,
              height: 32,
              resizeMode: 'contain',
              borderRadius: 8,
            }}
          />
          <Text
            style={{
              flex: 1,
              marginLeft: 10,
              fontWeight: 'bold',
              fontSize: 18,
              color: colors.text,
            }}
          >
            {getZingoName() + ' '}
            <Text
              style={{
                color:
                  mode === ModeEnum.basic
                    ? advancedTheme.colors.primary
                    : basicTheme.colors.primary,
                fontWeight: 'bold',
                fontSize: 14,
              }}
            >
              {
                translate(
                  `settings.value-mode-${mode === ModeEnum.basic ? ModeEnum.advanced : ModeEnum.basic}`,
                ) as string
              }
            </Text>
          </Text>
          <FontAwesomeIcon
            icon={faArrowsRotate}
            size={18}
            color={colors.zingo}
          />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 8,
            color: colors.border,
            marginTop: 12,
            marginBottom: 12,
          }}
        >
          {'Version: '}
          <Text style={{ color: colors.primaryDisabled }}>
            {getZingoVersion()}
          </Text>
          {'   '}
          {translate('settings.mode') as string}
          <Text style={{ color: colors.primaryDisabled }}>
            {translate(`settings.value-mode-${mode}`) as string}
          </Text>
        </Text>
      </View>
    </View>
  );
};

export default Menu;
