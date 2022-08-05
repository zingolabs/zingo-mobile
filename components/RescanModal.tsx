/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, ScrollView, SafeAreaView, Image, Text} from 'react-native';
import {RegText, ZecAmount, UsdAmount, zecPrice} from './Components';
import Button from './Button';
import {useTheme} from '@react-navigation/native';

type RescanModalProps = {
  closeModal: () => void;
  birthday?: number;
  startRescan: () => void;
};

const RescanModal: React.FunctionComponent<RescanModalProps> = ({birthday, startRescan, closeModal, totalBalance}) => {
  const {colors} = useTheme();

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
      <ScrollView
        style={{maxHeight: '85%'}}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View>
          <View
            style={{display: 'flex', alignItems: 'center', paddingBottom: 25, backgroundColor: colors.card, zIndex: -1}}>
            <RegText color={'#ffffff'} style={{marginTop: 5, padding: 5}}>Rescan</RegText>
            <ZecAmount size={36} amtZec={totalBalance.total} style={{opacity: 0.2}} />
          </View>
          <View style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -30}}>
            <Image
              source={require('../assets/img/logobig-zingo.png')}
              style={{width: 50, height: 50, resizeMode: 'contain'}}
            />
            <Text style={{ color: '#777777', fontSize: 40, fontWeight: 'bold' }}> ZingoZcash</Text>
          </View>
        </View>

        <View style={{display: 'flex', margin: 20}}>
          <RegText>
            This will re-fetch all transactions and rebuild your shielded wallet, starting from block height {birthday}.
            It might take several minutes.
          </RegText>
        </View>
      </ScrollView>

      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 20}}>
        <Button type="Primary" title="Rescan" onPress={doRescanAndClose} />
        <Button type="Secondary" title="Close" style={{marginLeft: 10}} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default RescanModal;
