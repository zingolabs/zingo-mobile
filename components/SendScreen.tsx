/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import {View, ScrollView, Modal} from 'react-native';
import {FadeText, RegTextInput, PrimaryButton, RegText} from '../components/Components';
import {Info, SendPageState} from '../app/AppState';
import {faQrcode, faUpload} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {useTheme} from '@react-navigation/native';
import Utils from '../app/utils';
import {TouchableOpacity} from 'react-native-gesture-handler';

type ScannerProps = {
  setToAddress: (addr: string | null) => void;
};
function ScanScreen({setToAddress}: ScannerProps) {
  const [error, setError] = useState<String | null>(null);

  const validateAddress = (scannedAddress: string) => {
    if (Utils.isSapling(scannedAddress) || Utils.isTransparent(scannedAddress)) {
      setToAddress(scannedAddress);
    } else {
      setError(`"${scannedAddress}" is not a valid Zcash Address`);
    }
  };

  const onRead = (e: any) => {
    const scandata = e.data.trim();

    let scannedAddress = scandata;

    validateAddress(scannedAddress);
  };

  const doCancel = () => {
    setToAddress(null);
  };

  const {colors} = useTheme();
  return (
    <QRCodeScanner
      onRead={onRead}
      reactivate={true}
      containerStyle={{backgroundColor: colors.background}}
      topContent={<RegText>Scan a Zcash Address</RegText>}
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
            <PrimaryButton style={{marginLeft: 50}} title="Cancel" onPress={doCancel} />
          </View>
        </View>
      }
    />
  );
}

type SendScreenProps = {
  info: Info | null;
  sendPageState: SendPageState;
  setSendPageState: (sendPageState: SendPageState) => void;
};

const SendScreen: React.FunctionComponent<SendScreenProps> = ({sendPageState, setSendPageState}) => {
  const {colors} = useTheme();
  const [qrcodeModalVisble, setQrcodeModalVisible] = useState(false);

  const updateToField = (address: string | null, amount: string | null, memo: string | null) => {
    const newToAddrs = sendPageState.toaddrs.slice(0);
    // Find the correct toAddr
    const toAddr = newToAddrs[0];
    if (!toAddr) {
      return;
    }

    if (address !== null) {
      toAddr.to = address.replace(/ /g, ''); // Remove spaces
    }

    if (amount !== null) {
      toAddr.amount = amount;
    }

    if (memo !== null) {
      toAddr.memo = memo;
    }

    // Create the new state object
    const newState = new SendPageState();
    newState.fromaddr = sendPageState.fromaddr;
    newState.toaddrs = newToAddrs;

    setSendPageState(newState);
  };

  const setToAddress = (address: string | null) => {
    if (address !== null) {
      updateToField(address, null, null);
    }
    setQrcodeModalVisible(false);
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{display: 'flex', flexDirection: 'column', justifyContent: 'flex-start'}}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={qrcodeModalVisble}
        onRequestClose={() => setQrcodeModalVisible(false)}>
        <ScanScreen setToAddress={setToAddress} />
      </Modal>

      <FadeText>To</FadeText>
      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start'}}>
        <RegTextInput
          style={{flexGrow: 1, borderBottomColor: '#ffffff', borderBottomWidth: 2}}
          value={sendPageState.toaddrs[0].to}
          onChangeText={(text: string) => updateToField(text, null, null)}
        />
        <TouchableOpacity onPress={() => setQrcodeModalVisible(true)}>
          <FontAwesomeIcon style={{margin: 5}} size={24} icon={faQrcode} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FadeText style={{marginTop: 20}}>Amount</FadeText>
      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start'}}>
        <RegTextInput
          placeholder="0.0"
          placeholderTextColor="#777777"
          keyboardType="numeric"
          style={{flexGrow: 1, borderBottomColor: '#ffffff', borderBottomWidth: 2}}
          value={sendPageState.toaddrs[0].amount.toString()}
          onChangeText={(text: string) => updateToField(null, text, null)}
        />
        <FontAwesomeIcon style={{margin: 5}} size={24} icon={faUpload} color={colors.text} />
      </View>

      <FadeText style={{marginTop: 20}}>Memo</FadeText>
      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start'}}>
        <RegTextInput
          multiline
          style={{flexGrow: 1, borderBottomColor: '#ffffff', borderBottomWidth: 2}}
          value={sendPageState.toaddrs[0].memo}
          onChangeText={(text: string) => updateToField(null, null, text)}
        />
      </View>

      <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: 20}}>
        <PrimaryButton title="Send" />
      </View>
    </ScrollView>
  );
};

export default SendScreen;
