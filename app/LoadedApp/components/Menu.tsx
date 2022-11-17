/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { ScrollView, Dimensions, View } from 'react-native';
import { TranslateOptions } from 'i18n-js';

import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';

import { useTheme } from '@react-navigation/native';

const window = Dimensions.get('window');

type MenuProps = {
  onItemSelected: (item: string) => Promise<void>;
  translate: (key: string, config?: TranslateOptions) => any;
};
const Menu: React.FunctionComponent<MenuProps> = ({ onItemSelected, translate }) => {
  const { colors } = useTheme();
  const item = {
    fontSize: 14,
    fontWeight: '300',
    paddingTop: 15,
    color: colors.text,
  };

  return (
    <ScrollView
      scrollsToTop={false}
      style={{
        flex: 1,
        width: window.width,
        height: window.height,
        backgroundColor: '#010101',
      }}
      contentContainerStyle={{ display: 'flex' }}>
      <FadeText style={{ margin: 20 }}>{translate('loadedapp.options')}</FadeText>
      <View style={{ height: 1, backgroundColor: colors.primary }} />

      <View style={{ display: 'flex', marginLeft: 20 }}>
        <RegText onPress={() => onItemSelected('About')} style={item}>
          {translate('loadedapp.about')}
        </RegText>

        <RegText onPress={() => onItemSelected('Info')} style={item}>
          {translate('loadedapp.info')}
        </RegText>

        <RegText onPress={() => onItemSelected('Settings')} style={item}>
          {translate('loadedapp.settings')}
        </RegText>

        <RegText onPress={() => onItemSelected('Wallet Seed')} style={item}>
          {translate('loadedapp.walletseed')}
        </RegText>

        <RegText onPress={() => onItemSelected('Rescan')} style={item}>
          {translate('loadedapp.rescanwallet')}
        </RegText>

        <RegText onPress={() => onItemSelected('Sync Report')} style={item} color={colors.primary}>
          {translate('loadedapp.report')}
        </RegText>

        <RegText onPress={() => onItemSelected('Change Wallet')} style={item} color={colors.primary}>
          {translate('loadedapp.changewallet')}
        </RegText>

        <RegText onPress={() => onItemSelected('Restore Wallet Backup')} style={item} color={colors.primary}>
          {translate('loadedapp.restorebackupwallet')}
        </RegText>
      </View>
    </ScrollView>
  );
};

export default Menu;
