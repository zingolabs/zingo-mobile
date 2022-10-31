/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ScrollView, SafeAreaView, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';

import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import Button from '../Button';
import { ThemeType } from '../../app/types';
import { TotalBalance } from '../../app/AppState';

type RescanProps = {
  closeModal: () => void;
  birthday?: number;
  startRescan: () => void;
  totalBalance: TotalBalance;
  currencyName?: string;
};

const Rescan: React.FunctionComponent<RescanProps> = ({
  birthday,
  startRescan,
  closeModal,
  totalBalance,
  currencyName,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;

  const doRescanAndClose = () => {
    startRescan();
    closeModal();
  };

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
          Rescan
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </View>

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{ display: 'flex', margin: 20 }}>
          <RegText>
            This will re-fetch all transactions and rebuild your shielded wallet, starting from block height {birthday}.
            It might take several minutes.
          </RegText>
        </View>
      </ScrollView>

      <View style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 20 }}>
        <Button type="Primary" title="Rescan" onPress={doRescanAndClose} />
        <Button type="Secondary" title="Close" style={{ marginLeft: 10 }} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default Rescan;
