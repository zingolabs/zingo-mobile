/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View, ScrollView, SafeAreaView, Image, TouchableOpacity, Modal } from 'react-native';
import { FadeText, RegText, RegTextInput, ZecAmount } from './Components';
import Button from './Button';
import { useTheme } from '@react-navigation/native';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import QRCodeScanner from 'react-native-qrcode-scanner';

type ScannerProps = {
  setPrivKeyText: (k: string) => void;
  closeModal: () => void;
};
function ScanScreen({ setPrivKeyText, closeModal }: ScannerProps) {
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

  const { colors } = useTheme();
  return (
    <QRCodeScanner
      onRead={onRead}
      reactivate={true}
      containerStyle={{ backgroundColor: colors.background }}
      topContent={<RegText>Scan a Private/Spending or Full Viewing/Viewing Key</RegText>}
      bottomContent={
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'center',
            width: '100%',
          }}>
          {error && <RegText style={{ textAlign: 'center' }}>{error}</RegText>}
          <View style={{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-evenly' }}>
            <Button type="Secondary" title="Cancel" onPress={doCancel} />
          </View>
        </View>
      }
    />
  );
}

type ImportKeyModalProps = {
  closeModal: () => void;
  doImport: (keyText: string, birthday: string) => void;
  totalBalance: object;
  currencyName: string;
};
const ImportKeyModal: React.FunctionComponent<ImportKeyModalProps> = ({
  closeModal,
  doImport,
  totalBalance,
  currencyName,
}) => {
  const { colors } = useTheme();

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
          source={require('../assets/img/logobig-zingo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain' }}
        />
        <ZecAmount currencyName={currencyName} size={36} amtZec={totalBalance.total} style={{ opacity: 0.4 }} />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          Import Key
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </View>

      <Modal
        animationType="slide"
        transparent={false}
        visible={qrcodeModalVisible}
        onRequestClose={() => setQrcodeModalVisible(false)}>
        <ScanScreen setPrivKeyText={setPrivKeyText} closeModal={() => setQrcodeModalVisible(false)} />
      </Modal>

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
        keyboardShouldPersistTaps="handled">
        <RegText style={{ margin: 10 }}>Private/Spending or Full Viewing/Viewing key</RegText>

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
            source={require('../assets/img/qr-code-scan.png')}
            style={{width: 50, height: 50, marginTop: 15, resizeMode: 'contain'}}
          />*/}
        </TouchableOpacity>

        <RegText
          style={{
            marginTop: 50,
            textAlign: 'center',
          }}>
          Key Birthday
        </RegText>
        <FadeText>Block height of first transaction. (OK to leave blank)</FadeText>
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

        <RegText style={{ margin: 20 }}>
          Importing a key requires a rescan, and make take a long time to complete. Your balances will update
          automatically.
        </RegText>
      </ScrollView>
      <View style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 20 }}>
        <Button type="Primary" title="Import" onPress={okButton} />
        <Button type="Secondary" title="Close" style={{ marginLeft: 10 }} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default ImportKeyModal;
