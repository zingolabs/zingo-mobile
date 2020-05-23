/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import {View, ScrollView, Modal, Image} from 'react-native';
import {FadeText, RegTextInput, PrimaryButton, RegText, ZecAmount, UsdAmount} from '../components/Components';
import {Info, SendPageState, TotalBalance} from '../app/AppState';
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
  totalBalance: TotalBalance;
  sendPageState: SendPageState;
  setSendPageState: (sendPageState: SendPageState) => void;
};

const SendScreen: React.FunctionComponent<SendScreenProps> = ({
  info,
  totalBalance,
  sendPageState,
  setSendPageState,
}) => {
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

  const memoEnabled = Utils.isSapling(sendPageState.toaddrs[0].to);
  const zecPrice = info ? info.zecPrice : null;
  const spendable = totalBalance.transparentBal + totalBalance.verifiedPrivate;

  return (
    <View
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
      }}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={qrcodeModalVisble}
        onRequestClose={() => setQrcodeModalVisible(false)}>
        <ScanScreen setToAddress={setToAddress} />
      </Modal>
      <View style={{display: 'flex', alignItems: 'center', height: 140, backgroundColor: colors.card}}>
        <RegText style={{marginTop: 10, marginBottom: 5}}>Spendable</RegText>
        <ZecAmount size={36} amtZec={spendable} />
        <UsdAmount style={{marginTop: 5}} price={zecPrice} amtZec={spendable} />
      </View>
      <View style={{display: 'flex', alignItems: 'center', marginTop: -25}}>
        <Image source={require('../assets/img/logobig.png')} style={{width: 50, height: 50, resizeMode: 'contain'}} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: 10,
          marginTop: 20,
        }}>
        <FadeText>To</FadeText>
        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start'}}>
          <RegTextInput
            placeholder="ZEC z-address or t-address"
            style={{flexGrow: 1, maxWidth: '90%', borderBottomColor: '#ffffff', borderBottomWidth: 2}}
            value={sendPageState.toaddrs[0].to}
            onChangeText={(text: string) => updateToField(text, null, null)}
          />
          <TouchableOpacity onPress={() => setQrcodeModalVisible(true)}>
            <FontAwesomeIcon style={{margin: 5}} size={24} icon={faQrcode} color={colors.text} />
          </TouchableOpacity>
        </View>

        <FadeText style={{marginTop: 30}}>Amount</FadeText>
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

        <FadeText style={{marginTop: 30}}>Memo</FadeText>
        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start'}}>
          {memoEnabled && (
            <RegTextInput
              multiline
              style={{flexGrow: 1, borderBottomColor: '#ffffff', borderBottomWidth: 2}}
              value={sendPageState.toaddrs[0].memo}
              onChangeText={(text: string) => updateToField(null, null, text)}
            />
          )}
          {!memoEnabled && <RegText>(Memos only for sending to z-addresses)</RegText>}
        </View>

        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', marginTop: 20}}>
          <PrimaryButton title="Send" />
        </View>
      </ScrollView>
    </View>
  );
};

export default SendScreen;
