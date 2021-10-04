/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {View, ScrollView, SafeAreaView, Image, Text, TouchableOpacity, Modal} from 'react-native';
import {FadeText, PrimaryButton, RegText, RegTextInput, SecondaryButton} from './Components';
import {useTheme} from '@react-navigation/native';
import cstyles from './CommonStyles';
import QRCodeScanner from 'react-native-qrcode-scanner';

type ScannerProps = {
  setPrivKeyText: (k: string) => void;
  closeModal: () => void;
};
function ScanScreen({setPrivKeyText, closeModal}: ScannerProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<String | null>(null);

  const validateKey = (scannedKey: string) => {
    setPrivKeyText(scannedKey);
    closeModal();
  };

  const onRead = (e: any) => {
    const scandata = e.data.trim();

    validateKey(scandata);
  };

  const doCancel = () => {
    closeModal();
  };

  const {colors} = useTheme();
  return (
    <QRCodeScanner
      onRead={onRead}
      reactivate={true}
      containerStyle={{backgroundColor: colors.background}}
      topContent={<RegText>Scan a Private or Viewing Key</RegText>}
      bottomContent={
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'center',
            width: '100%',
          }}>
          {error && <RegText style={{textAlign: 'center'}}>{error}</RegText>}
          <View style={{flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-evenly'}}>
            <SecondaryButton title="Cancel" onPress={doCancel} />
          </View>
        </View>
      }
    />
  );
}

type ImportKeyModalProps = {
  closeModal: () => void;
  doImport: (keyText: string, birthday: string) => void;
};
const ImportKeyModal: React.FunctionComponent<ImportKeyModalProps> = ({closeModal, doImport}) => {
  const {colors} = useTheme();

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
      <View>
        <View style={{alignItems: 'center', backgroundColor: colors.card, paddingBottom: 25, paddingTop: 25}}>
          <Text style={{marginTop: 5, padding: 5, color: colors.text, fontSize: 28}}>Import Key</Text>
        </View>
        <View style={{display: 'flex', alignItems: 'center', marginTop: -25}}>
          <Image source={require('../assets/img/logobig.png')} style={{width: 50, height: 50, resizeMode: 'contain'}} />
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={false}
        visible={qrcodeModalVisible}
        onRequestClose={() => setQrcodeModalVisible(false)}>
        <ScanScreen setPrivKeyText={setPrivKeyText} closeModal={() => setQrcodeModalVisible(false)} />
      </Modal>

      <ScrollView
        style={{maxHeight: '85%'}}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}>
        <RegText style={{margin: 20}}>Private or Viewing key</RegText>

        <RegTextInput
          multiline
          style={[
            {
              maxWidth: '95%',
              minWidth: '95%',
              borderColor: 'gray',
              borderWidth: 1,
              minHeight: 100,
            },
            cstyles.innerpaddingsmall,
          ]}
          value={privKeyText}
          onChangeText={setPrivKeyText}
        />

        <TouchableOpacity
          onPress={() => {
            setQrcodeModalVisible(true);
          }}>
          <Image
            source={require('../assets/img/qr-code-scan.png')}
            style={{width: 50, height: 50, marginTop: 15, resizeMode: 'contain'}}
          />
        </TouchableOpacity>

        <RegText style={[cstyles.margintop, cstyles.center]}>Key Birthday</RegText>
        <FadeText>Block height of first transaction. (OK to leave blank)</FadeText>
        <RegTextInput
          style={[
            {
              maxWidth: '50%',
              minWidth: '50%',
              borderColor: 'gray',
              borderWidth: 1,
            },
            cstyles.innerpaddingsmall,
          ]}
          value={birthday}
          keyboardType="numeric"
          onChangeText={setBirthday}
        />

        <FadeText style={{margin: 20}}>
          Importing a key requires a rescan, and make take a long time to complete. Your balances will update
          automatically.
        </FadeText>
      </ScrollView>
      <View
        style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', margin: 10}}>
        <PrimaryButton title={'Import'} onPress={okButton} />
        <SecondaryButton title="Close" onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default ImportKeyModal;
