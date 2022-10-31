/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { ScrollView, Dimensions, View } from 'react-native';

import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';

import { useTheme } from '@react-navigation/native';

const window = Dimensions.get('window');

function Menu({ onItemSelected }: any) {
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
      <FadeText style={{ margin: 20 }}>Options</FadeText>
      <View style={{ height: 1, backgroundColor: colors.primary }} />

      <View style={{ display: 'flex', marginLeft: 20 }}>
        <RegText onPress={() => onItemSelected('About')} style={item}>
          About Zingo!
        </RegText>

        <RegText onPress={() => onItemSelected('Info')} style={item}>
          Server Info
        </RegText>

        <RegText onPress={() => onItemSelected('Settings')} style={item}>
          Settings
        </RegText>

        <RegText onPress={() => onItemSelected('Wallet Seed')} style={item}>
          Wallet Seed
        </RegText>

        <RegText onPress={() => onItemSelected('Rescan')} style={item}>
          Rescan Wallet
        </RegText>

        <RegText onPress={() => onItemSelected('Sync Report')} style={item} color={colors.primary}>
          Sync / Rescan Report
        </RegText>

        <RegText onPress={() => onItemSelected('Change Wallet')} style={item} color={colors.primary}>
          Change to another Wallet
        </RegText>

        <RegText onPress={() => onItemSelected('Restore Wallet Backup')} style={item} color={colors.primary}>
          Restore Last Wallet Backup
        </RegText>
      </View>
    </ScrollView>
  );
}

export default Menu;
