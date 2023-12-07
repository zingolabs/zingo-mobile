/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { ScrollView, View, Text, Dimensions } from 'react-native';

import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';

import { useTheme } from '@react-navigation/native';
import { ContextAppLoaded } from '../../context';
import RPC from '../../rpc';
import { ThemeType } from '../../types';

type MenuProps = {
  onItemSelected: (item: string) => Promise<void>;
};

const Menu: React.FunctionComponent<MenuProps> = ({ onItemSelected }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, readOnly, mode, transactions } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const item = {
    fontSize: 14,
    paddingTop: 15,
  };
  const dimensions = {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  };

  const onItemSelectedWrapper = (value: string) => {
    // if the user click on a screen in the menu the sync is going to continue
    (async () => await RPC.rpc_setInterruptSyncAfterBatch('false'))();
    onItemSelected(value);
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
        <FadeText style={{ margin: 20 }}>{translate('loadedapp.options') as string}</FadeText>
        <View style={{ height: 1, backgroundColor: colors.primary }} />

        <View style={{ display: 'flex', marginLeft: 20 }}>
          <RegText onPress={() => onItemSelectedWrapper('About')} style={item}>
            {translate('loadedapp.about') as string}
          </RegText>

          {mode !== 'basic' && (
            <RegText onPress={() => onItemSelectedWrapper('Info')} style={item}>
              {translate('loadedapp.info') as string}
            </RegText>
          )}

          <RegText testID="menu.settings" onPress={() => onItemSelectedWrapper('Settings')} style={item}>
            {translate('loadedapp.settings') as string}
          </RegText>

          <RegText
            testID="menu.addressbook"
            onPress={() => onItemSelectedWrapper('Address Book')}
            style={{ ...item, color: colors.primary }}>
            {translate('loadedapp.addressbook') as string}
          </RegText>

          {!(mode === 'basic' && transactions.length <= 0) && (
            <RegText onPress={() => onItemSelectedWrapper('Wallet')} style={item}>
              {readOnly
                ? mode === 'basic'
                  ? (translate('loadedapp.walletufvk-basic') as string)
                  : (translate('loadedapp.walletufvk') as string)
                : mode === 'basic'
                ? (translate('loadedapp.walletseed-basic') as string)
                : (translate('loadedapp.walletseed') as string)}
            </RegText>
          )}

          {mode !== 'basic' && (
            <RegText onPress={() => onItemSelectedWrapper('Rescan')} style={item}>
              {translate('loadedapp.rescanwallet') as string}
            </RegText>
          )}

          {mode !== 'basic' && (
            <RegText testID="menu.syncreport" onPress={() => onItemSelectedWrapper('Sync Report')} style={item}>
              {translate('loadedapp.report') as string}
            </RegText>
          )}

          {mode !== 'basic' && (
            <RegText testID="menu.fund-pools" onPress={() => onItemSelectedWrapper('Fund Pools')} style={item}>
              {translate('loadedapp.fundpools') as string}
            </RegText>
          )}

          {!(mode === 'basic' && transactions.length <= 0) && (
            <RegText onPress={() => onItemSelectedWrapper('Insight')} style={item}>
              {translate('loadedapp.insight') as string}
            </RegText>
          )}

          {mode !== 'basic' && (
            <RegText testID="menu.changewallet" onPress={() => onItemSelectedWrapper('Change Wallet')} style={item}>
              {translate('loadedapp.changewallet') as string}
            </RegText>
          )}

          {mode !== 'basic' && (
            <RegText onPress={() => onItemSelectedWrapper('Restore Wallet Backup')} style={item}>
              {translate('loadedapp.restorebackupwallet') as string}
            </RegText>
          )}
          {mode === 'basic' && transactions.length === 0 && (
            <RegText onPress={() => onItemSelectedWrapper('Load Wallet From Seed')} style={item}>
              {translate('loadedapp.loadwalletfromseed-basic') as string}
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
