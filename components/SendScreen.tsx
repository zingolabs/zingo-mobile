/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import {View, ScrollView, Modal, Image, Alert, SafeAreaView} from 'react-native';
import {
  FadeText,
  BoldText,
  ErrorText,
  RegTextInput,
  PrimaryButton,
  RegText,
  ZecAmount,
  UsdAmount,
} from '../components/Components';
import {Info, SendPageState, TotalBalance} from '../app/AppState';
import {faQrcode, faCheck, faArrowAltCircleUp} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {useTheme} from '@react-navigation/native';
import Utils from '../app/utils';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Toast from 'react-native-simple-toast';

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

const ComputingTxModalContent: React.FunctionComponent<any> = ({}) => {
  const {colors} = useTheme();

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <RegText>Computing Transaction</RegText>
      <RegText>Please wait...</RegText>
    </SafeAreaView>
  );
};

type ConfirmModalProps = {
  sendPageState: SendPageState;
  price?: number | null;
  closeModal: () => void;
  confirmSend: () => void;
};
const ConfirmModalContent: React.FunctionComponent<ConfirmModalProps> = ({
  closeModal,
  confirmSend,
  sendPageState,
  price,
}) => {
  const {colors} = useTheme();

  const sendingTotal =
    sendPageState.toaddrs.reduce((s, t) => s + parseFloat(t.amount || '0'), 0.0) + Utils.getDefaultFee();

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <ScrollView contentContainerStyle={{display: 'flex', justifyContent: 'flex-start'}}>
        <BoldText style={{textAlign: 'center', margin: 10}}>Confirm Transaction</BoldText>

        <View style={{display: 'flex', alignItems: 'center', padding: 10, backgroundColor: colors.card}}>
          <BoldText style={{textAlign: 'center'}}>Sending</BoldText>

          <ZecAmount amtZec={sendingTotal} />
          <UsdAmount amtZec={sendingTotal} price={price} />
        </View>
        {sendPageState.toaddrs.map((to) => {
          return (
            <View key={to.id} style={{margin: 10}}>
              <RegText>{Utils.trimToSmall(to.to, 10)}</RegText>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}>
                <ZecAmount amtZec={parseFloat(to.amount)} />
                <UsdAmount amtZec={parseFloat(to.amount)} price={price} />
              </View>
              <RegText>{to.memo || ''}</RegText>
            </View>
          );
        })}

        <View style={{margin: 10}}>
          <RegText>Fee</RegText>
          <View
            style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <ZecAmount amtZec={Utils.getDefaultFee()} />
            <UsdAmount amtZec={Utils.getDefaultFee()} price={price} />
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}>
        <PrimaryButton title={'Confirm'} onPress={confirmSend} />
        <PrimaryButton title={'Cancel'} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

type SendScreenProps = {
  info: Info | null;
  totalBalance: TotalBalance;
  sendPageState: SendPageState;
  setSendPageState: (sendPageState: SendPageState) => void;
  sendTransaction: () => void;
};

const SendScreen: React.FunctionComponent<SendScreenProps> = ({
  info,
  totalBalance,
  sendPageState,
  setSendPageState,
  sendTransaction,
}) => {
  const {colors} = useTheme();
  const [qrcodeModalVisble, setQrcodeModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [computingModalVisible, setComputingModalVisible] = useState(false);

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

  const confirmSend = async () => {
    // First, close the confirm modal and show the "computing" modal
    setConfirmModalVisible(false);
    setComputingModalVisible(true);

    // call the sendTransaction method in a timeout, allowing the modals to show properly
    setTimeout(async () => {
      try {
        const txid = await sendTransaction();
        setComputingModalVisible(false);

        Toast.show(`Successfully Broadcast Tx: ${txid}`, Toast.LONG);
      } catch (err) {
        console.log('sendtx error', err);

        setComputingModalVisible(false);
        Alert.alert('Error sending Tx', `${err}`);
      }
    }, 100);
  };

  const spendable = totalBalance.transparentBal + totalBalance.verifiedPrivate;

  const setMaxAmount = () => {
    updateToField(null, Utils.maxPrecisionTrimmed(spendable - Utils.getDefaultFee()), null);
  };

  const memoEnabled = Utils.isSapling(sendPageState.toaddrs[0].to);
  const zecPrice = info ? info.zecPrice : null;

  var addressValidationState: number;
  var toaddr = sendPageState.toaddrs[0];
  if (toaddr.to !== '') {
    if (Utils.isSapling(toaddr.to) || Utils.isTransparent(toaddr.to)) {
      addressValidationState = 1;
    } else {
      addressValidationState = -1;
    }
  } else {
    addressValidationState = 0;
  }

  var amountValidationState: number;
  if (toaddr.amount !== '') {
    if (parseFloat(toaddr.amount) > 0 && parseFloat(toaddr.amount) <= spendable + Utils.getDefaultFee()) {
      amountValidationState = 1;
    } else {
      amountValidationState = -1;
    }
  } else {
    amountValidationState = 0;
  }

  const sendButtonEnabled = addressValidationState === 1 && amountValidationState === 1;

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

      <Modal
        animationType="slide"
        transparent={false}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}>
        <ConfirmModalContent
          sendPageState={sendPageState}
          price={info?.zecPrice}
          closeModal={() => {
            setConfirmModalVisible(false);
          }}
          confirmSend={confirmSend}
        />
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={computingModalVisible}
        onRequestClose={() => setComputingModalVisible(false)}>
        <ComputingTxModalContent />
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
        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <FadeText>To</FadeText>
          {addressValidationState === 1 && <FontAwesomeIcon icon={faCheck} color="green" />}
          {addressValidationState === -1 && <ErrorText>Invalid Address!</ErrorText>}
        </View>
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

        <View style={{marginTop: 30, display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
          <FadeText>Amount (ZEC)</FadeText>
          {amountValidationState === 1 && <FontAwesomeIcon icon={faCheck} color="green" />}
          {amountValidationState === -1 && <ErrorText>Invalid Amount!</ErrorText>}
        </View>
        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start'}}>
          <RegTextInput
            placeholder="0.0"
            placeholderTextColor="#777777"
            keyboardType="numeric"
            style={{flexGrow: 1, borderBottomColor: '#ffffff', borderBottomWidth: 2}}
            value={sendPageState.toaddrs[0].amount.toString()}
            onChangeText={(text: string) => updateToField(null, text, null)}
          />
          <TouchableOpacity onPress={() => setMaxAmount()}>
            <FontAwesomeIcon style={{margin: 5}} size={24} icon={faArrowAltCircleUp} color={colors.text} />
          </TouchableOpacity>
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
          <PrimaryButton title="Send" disabled={!sendButtonEnabled} onPress={() => setConfirmModalVisible(true)} />
        </View>
      </ScrollView>
    </View>
  );
};

export default SendScreen;
