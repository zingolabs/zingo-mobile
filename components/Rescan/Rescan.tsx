/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, SafeAreaView, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';

import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import Button from '../Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import ZingoHeader from '../ZingoHeader';

type RescanProps = {
  closeModal: () => void;
  startRescan: () => void;
};

const Rescan: React.FunctionComponent<RescanProps> = ({ closeModal, startRescan }) => {
  const context = useContext(ContextAppLoaded);
  const { walletSeed, totalBalance, info, translate } = context;
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
      <ZingoHeader>
        <ZecAmount
          currencyName={info.currencyName ? info.currencyName : ''}
          size={36}
          amtZec={totalBalance.total}
          style={{ opacity: 0.5 }}
        />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          {translate('rescan.title')}
        </RegText>
      </ZingoHeader>

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
          <RegText>{translate('rescan.text-1') + walletSeed.birthday + translate('rescan.text-2')}</RegText>
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
        <Button type="Primary" title={translate('rescan.button')} onPress={doRescanAndClose} />
        <Button type="Secondary" title={translate('cancel')} style={{ marginLeft: 10 }} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default Rescan;
