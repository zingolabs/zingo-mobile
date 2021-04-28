/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, ScrollView, SafeAreaView, Image, Text} from 'react-native';
import {SecondaryButton, PrimaryButton, RegText} from './Components';
import {useTheme} from '@react-navigation/native';

type RescanModalProps = {
  closeModal: () => void;
  birthday?: number;
  startRescan: () => void;
};

const RescanModal: React.FunctionComponent<RescanModalProps> = ({birthday, startRescan, closeModal}) => {
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
          <View style={{alignItems: 'center', backgroundColor: colors.card, paddingBottom: 25}}>
            <Text style={{marginTop: 5, padding: 5, color: colors.text, fontSize: 28}}>Rescan Wallet</Text>
          </View>
          <View style={{display: 'flex', alignItems: 'center', marginTop: -25}}>
            <Image
              source={require('../assets/img/logobig.png')}
              style={{width: 50, height: 50, resizeMode: 'contain'}}
            />
          </View>
        </View>

        <View style={{display: 'flex', margin: 10}}>
          <RegText>
            This will re-fetch all transactions and rebuild your shielded wallet, starting from block height {birthday}.
            It might take several minutes.
          </RegText>
        </View>
      </ScrollView>

      <View style={{flexGrow: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', margin: 20}}>
        <PrimaryButton title="Rescan" onPress={doRescanAndClose} />
        <SecondaryButton title="Close" style={{marginTop: 10}} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default RescanModal;
