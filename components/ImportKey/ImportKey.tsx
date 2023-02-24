/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

import FadeText from '../Components/FadeText';
import RegText from '../Components/RegText';
import Button from '../Components/Button';
import ScannerKey from './components/ScannerKey';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';

type ImportKeyProps = {
  closeModal: () => void;
  doImport: (keyText: string, birthday: string) => void;
};
const ImportKey: React.FunctionComponent<ImportKeyProps> = ({ closeModal, doImport }) => {
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
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
      <Modal
        animationType="slide"
        transparent={false}
        visible={qrcodeModalVisible}
        onRequestClose={() => setQrcodeModalVisible(false)}>
        <ScannerKey setPrivKeyText={setPrivKeyText} closeModal={() => setQrcodeModalVisible(false)} />
      </Modal>

      <Header title={translate('import.title') as string} noBalance={true} noSyncingStatus={true} noDrawMenu={true} />

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
        keyboardShouldPersistTaps="handled">
        <RegText style={{ margin: 10 }}>{translate('import.key-label') as string}</RegText>

        <View
          accessible={true}
          accessibilityLabel={translate('import.key-acc') as string}
          style={{
            padding: 10,
            maxWidth: '95%',
            borderWidth: 1,
            borderRadius: 10,
            borderColor: colors.border,
            minWidth: '95%',
            minHeight: 100,
          }}>
          <TextInput
            multiline
            style={{
              color: colors.text,
              fontWeight: '600',
              minWidth: '95%',
              minHeight: 100,
              marginLeft: 5,
            }}
            value={privKeyText}
            onChangeText={setPrivKeyText}
            editable={true}
          />
        </View>

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
          {translate('import.birthday') as string}
        </RegText>
        <FadeText>{translate('seed.birthday-no-readonly') as string}</FadeText>

        <View
          accessible={true}
          accessibilityLabel={translate('import.birthday-acc') as string}
          style={{
            padding: 10,
            maxWidth: '50%',
            borderWidth: 1,
            borderRadius: 5,
            borderColor: colors.border,
            margin: 10,
            minWidth: '50%',
            minHeight: 48,
          }}>
          <TextInput
            placeholder="#"
            placeholderTextColor={colors.placeholder}
            style={{
              color: colors.text,
              fontWeight: '600',
              minWidth: '50%',
              minHeight: 48,
              marginLeft: 5,
            }}
            value={birthday}
            onChangeText={setBirthday}
            editable={true}
            keyboardType="numeric"
          />
        </View>

        <RegText style={{ margin: 20, marginBottom: 30 }}>{translate('import.text') as string}</RegText>
      </ScrollView>
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button type="Primary" title={translate('import.button') as string} onPress={okButton} />
        <Button
          type="Secondary"
          title={translate('cancel') as string}
          style={{ marginLeft: 10 }}
          onPress={closeModal}
        />
      </View>
    </SafeAreaView>
  );
};

export default ImportKey;
