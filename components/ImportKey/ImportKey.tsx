/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View, ScrollView, SafeAreaView, Image, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { TranslateOptions } from 'i18n-js';

import FadeText from '../Components/FadeText';
import RegText from '../Components/RegText';
import RegTextInput from '../Components/RegTextInput';
import ZecAmount from '../Components/ZecAmount';
import Button from '../Button';
import { TotalBalance } from '../../app/AppState';
import Scanner from './components/Scanner';
import { ThemeType } from '../../app/types';

type ImportKeyProps = {
  closeModal: () => void;
  doImport: (keyText: string, birthday: string) => void;
  totalBalance: TotalBalance;
  currencyName?: string;
  translate: (key: string, config?: TranslateOptions) => any;
};
const ImportKey: React.FunctionComponent<ImportKeyProps> = ({
  closeModal,
  doImport,
  totalBalance,
  currencyName,
  translate,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;

  const [privKeyText, setPrivKeyText] = useState('');
  const [birthday, setBirthday] = useState('0');
  const [qrcodeModalVisible, setQrcodeModalVisible] = useState(false);

  const okButton = () => {
    doImport(privKeyText, birthday);
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
          source={require('../../assets/img/logobig-zingo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain' }}
        />
        <ZecAmount currencyName={currencyName} size={36} amtZec={totalBalance.total} style={{ opacity: 0.4 }} />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          {translate('import.title')}
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </View>

      <Modal
        animationType="slide"
        transparent={false}
        visible={qrcodeModalVisible}
        onRequestClose={() => setQrcodeModalVisible(false)}>
        <Scanner
          setPrivKeyText={setPrivKeyText}
          closeModal={() => setQrcodeModalVisible(false)}
          translate={translate}
        />
      </Modal>

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
        keyboardShouldPersistTaps="handled">
        <RegText style={{ margin: 10 }}>{translate('import.key-label')}</RegText>

        <RegTextInput
          multiline
          style={{
            padding: 10,
            maxWidth: '95%',
            minWidth: '95%',
            borderWidth: 1,
            borderRadius: 10,
            borderColor: colors.border,
            minHeight: 100,
            color: colors.text,
          }}
          value={privKeyText}
          onChangeText={setPrivKeyText}
        />

        <TouchableOpacity
          onPress={() => {
            setQrcodeModalVisible(true);
          }}>
          <FontAwesomeIcon style={{ margin: 5 }} size={50} icon={faQrcode} color={colors.border} />
          {/*<Image
            source={require('../../assets/img/qr-code-scan.png')}
            style={{width: 50, height: 50, marginTop: 15, resizeMode: 'contain'}}
          />*/}
        </TouchableOpacity>

        <RegText
          style={{
            marginTop: 50,
            textAlign: 'center',
          }}>
          {translate('import.birthday')}
        </RegText>
        <FadeText>{translate('seed.birthday-no-readonly')}</FadeText>
        <RegTextInput
          style={{
            padding: 10,
            maxWidth: '50%',
            minWidth: '50%',
            borderWidth: 1,
            borderRadius: 5,
            borderColor: colors.border,
            margin: 10,
            color: colors.text,
          }}
          value={birthday}
          keyboardType="numeric"
          onChangeText={setBirthday}
        />

        <RegText style={{ margin: 20 }}>{translate('import.text')}</RegText>
      </ScrollView>
      <View style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 20 }}>
        <Button type="Primary" title={translate('import.button')} onPress={okButton} />
        <Button type="Secondary" title={translate('cancel')} style={{ marginLeft: 10 }} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default ImportKey;
