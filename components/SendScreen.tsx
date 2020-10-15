/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect, useRef} from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import {View, ScrollView, Modal, Image, Alert, SafeAreaView, Keyboard} from 'react-native';
import {
  FadeText,
  BoldText,
  ErrorText,
  RegTextInput,
  PrimaryButton,
  SecondaryButton,
  RegText,
  ZecAmount,
  UsdAmount,
} from '../components/Components';
import {Info, SendPageState, ToAddr, TotalBalance} from '../app/AppState';
import {faQrcode, faCheck, faArrowAltCircleUp, faInfo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {useTheme} from '@react-navigation/native';
import {NavigationScreenProp} from 'react-navigation';
import Utils from '../app/utils';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Toast from 'react-native-simple-toast';
import {getNumberFormatSettings} from 'react-native-localize';
import {faBars} from '@fortawesome/free-solid-svg-icons';
import Animated, {Easing} from 'react-native-reanimated';
import {parseZcashURI} from '../app/uris';

type ScannerProps = {
  idx: number;
  updateToField: (idx: number, address: string | null, amount: string | null, memo: string | null) => void;
  closeModal: () => void;
};
function ScanScreen({idx, updateToField, closeModal}: ScannerProps) {
  const [error, setError] = useState<String | null>(null);

  const validateAddress = (scannedAddress: string) => {
    if (Utils.isSapling(scannedAddress) || Utils.isTransparent(scannedAddress)) {
      updateToField(idx, scannedAddress, null, null);
      closeModal();
    } else {
      // Try to parse as a URI
      if (scannedAddress.startsWith('zcash:')) {
        const targets = parseZcashURI(scannedAddress);

        if (Array.isArray(targets)) {
          updateToField(idx, scannedAddress, null, null);
          closeModal();
        } else {
          setError(`URI Error: ${targets}`);
        }
      } else {
        setError(`"${scannedAddress}" is not a valid Zcash Address`);
      }
    }
  };

  const onRead = (e: any) => {
    const scandata = e.data.trim();
    let scannedAddress = scandata;

    validateAddress(scannedAddress);
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
            <SecondaryButton title="Cancel" onPress={doCancel} />
          </View>
        </View>
      }
    />
  );
}

const ComputingTxModalContent: React.FunctionComponent<any> = ({}) => {
  const {colors} = useTheme();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let timerID = setInterval(() => {
      setSeconds(seconds + 1);
    }, 1000);

    return () => clearInterval(timerID);
  }, [seconds]);

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
      <RegText>(This can take up to a minute)</RegText>
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
    sendPageState.toaddrs.reduce((s, t) => s + Utils.parseLocaleFloat(t.amount || '0'), 0.0) + Utils.getDefaultFee();

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
        <View style={{display: 'flex', alignItems: 'center', padding: 10, backgroundColor: colors.card}}>
          <BoldText style={{textAlign: 'center', margin: 10}}>Confirm Transaction</BoldText>
        </View>

        <View
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: 25,
            padding: 10,
            borderWidth: 1,
            borderRadius: 10,
            borderColor: colors.border,
          }}>
          <BoldText style={{textAlign: 'center'}}>Sending</BoldText>

          <ZecAmount amtZec={sendingTotal} />
          <UsdAmount amtZec={sendingTotal} price={price} />
        </View>
        {sendPageState.toaddrs.map((to) => {
          return (
            <View key={to.id} style={{margin: 10}}>
              <FadeText>To</FadeText>
              <RegText>{Utils.splitAddressIntoChunks(to.to, 8).join(' ')}</RegText>

              <FadeText style={{marginTop: 10}}>Amount</FadeText>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: 5,
                }}>
                <ZecAmount size={18} amtZec={Utils.parseLocaleFloat(to.amount)} />
                <UsdAmount style={{fontSize: 18}} amtZec={Utils.parseLocaleFloat(to.amount)} price={price} />
              </View>
              <RegText>{to.memo || ''}</RegText>
            </View>
          );
        })}

        <View style={{margin: 10}}>
          <FadeText>Fee</FadeText>
          <View
            style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <ZecAmount size={18} amtZec={Utils.getDefaultFee()} />
            <UsdAmount style={{fontSize: 18}} amtZec={Utils.getDefaultFee()} price={price} />
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          marginTop: 10,
        }}>
        <PrimaryButton title={'Confirm'} onPress={confirmSend} />
        <SecondaryButton style={{marginTop: 20}} title={'Cancel'} onPress={closeModal} />
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
  clearToAddrs: () => void;
  navigation: NavigationScreenProp<any>;
  toggleMenuDrawer: () => void;
};

const SendScreen: React.FunctionComponent<SendScreenProps> = ({
  info,
  totalBalance,
  sendPageState,
  setSendPageState,
  sendTransaction,
  clearToAddrs,
  navigation,
  toggleMenuDrawer,
}) => {
  const {colors} = useTheme();
  const [qrcodeModalVisble, setQrcodeModalVisible] = useState(false);
  const [qrcodeModalIndex, setQrcodeModalIndex] = useState(0);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [computingModalVisible, setComputingModalVisible] = useState(false);

  const [titleViewHeight, setTitleViewHeight] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      Animated.timing(slideAnim, {toValue: 0 - titleViewHeight + 25, duration: 100, easing: Easing.linear}).start();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(slideAnim, {toValue: 0, duration: 100, easing: Easing.linear}).start();
    });

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, [slideAnim, titleViewHeight]);

  const updateToField = (idx: number, address: string | null, amount: string | null, memo: string | null) => {
    // Create the new state object
    const newState = new SendPageState();
    newState.fromaddr = sendPageState.fromaddr;

    const newToAddrs = sendPageState.toaddrs.slice(0);
    // Find the correct toAddr
    const toAddr = newToAddrs[idx];

    if (address !== null) {
      // Attempt to parse as URI if it starts with zcash
      if (address.startsWith('zcash:')) {
        const targets = parseZcashURI(address);
        //console.log(targets);

        if (Array.isArray(targets)) {
          // redo the to addresses
          const uriToAddrs: ToAddr[] = [];
          targets.forEach((tgt) => {
            const to = new ToAddr(Utils.getNextToAddrID());

            to.to = tgt.address || '';
            to.amount = Utils.maxPrecisionTrimmed(tgt.amount || 0);
            to.memo = tgt.memoString || '';

            uriToAddrs.push(to);
          });

          newState.toaddrs = uriToAddrs;

          setSendPageState(newState);
          return;
        } else {
          // Show the error message as a toast
          Toast.show(targets);
          return;
        }
      } else {
        if (!toAddr) {
          return;
        }
        toAddr.to = address.replace(/[ \t\n\r]+/g, ''); // Remove spaces
      }
    }

    if (amount !== null) {
      toAddr.amount = amount;
    }

    if (memo !== null) {
      toAddr.memo = memo;
    }

    newState.toaddrs = newToAddrs;
    setSendPageState(newState);
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

        // Clear the fields
        clearToAddrs();

        navigation.navigate('WALLET');
        setTimeout(() => {
          Toast.show(`Successfully Broadcast Tx: ${txid}`, Toast.LONG);
        }, 1000);
      } catch (err) {
        setTimeout(() => {
          console.log('sendtx error', err);
          Alert.alert('Error sending Tx', `${err}`, [{text: 'OK', onPress: () => setComputingModalVisible(false)}], {
            cancelable: false,
          });
        }, 1000);
      }
    });
  };

  const spendable = totalBalance.transparentBal + totalBalance.verifiedPrivate;
  const stillConfirming = spendable !== totalBalance.total;

  const setMaxAmount = (idx: number) => {
    let max = spendable - Utils.getDefaultFee();
    if (max < 0) {
      max = 0;
    }
    updateToField(idx, null, Utils.maxPrecisionTrimmed(max), null);
  };

  const memoEnabled = Utils.isSapling(sendPageState.toaddrs[0].to);
  const zecPrice = info ? info.zecPrice : null;

  var addressValidationState: number[] = sendPageState.toaddrs.map((to) => {
    if (to.to !== '') {
      if (Utils.isSapling(to.to) || Utils.isTransparent(to.to)) {
        return 1;
      } else {
        return -1;
      }
    } else {
      return 0;
    }
  });

  var amountValidationState: number[] = sendPageState.toaddrs.map((to) => {
    if (to.amount !== '') {
      if (
        Utils.parseLocaleFloat(to.amount) > 0 &&
        Utils.parseLocaleFloat(to.amount) <= parseFloat((spendable - Utils.getDefaultFee()).toFixed(8))
      ) {
        return 1;
      } else {
        return -1;
      }
    } else {
      return 0;
    }
  });

  // Send button is enabled if all address and amount validation states are 1
  const sendButtonEnabled =
    addressValidationState.filter((n) => n === 1).length === addressValidationState.length &&
    amountValidationState.filter((n) => n === 1).length === amountValidationState.length;

  const {decimalSeparator} = getNumberFormatSettings();

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
        <ScanScreen
          idx={qrcodeModalIndex}
          updateToField={updateToField}
          closeModal={() => setQrcodeModalVisible(false)}
        />
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

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
        }}>
        <Animated.View style={{marginTop: slideAnim}}>
          <View
            onLayout={(e) => {
              const {height} = e.nativeEvent.layout;
              setTitleViewHeight(height);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingBottom: 25,
              backgroundColor: colors.card,
              zIndex: -1,
            }}>
            <RegText style={{marginTop: 5, padding: 5}}>Spendable</RegText>
            <ZecAmount size={36} amtZec={spendable} />
            <UsdAmount style={{marginTop: 5}} price={zecPrice} amtZec={spendable} />
          </View>
        </Animated.View>

        <Animated.View style={{backgroundColor: '#353535', padding: 10, position: 'absolute', marginTop: slideAnim}}>
          <TouchableOpacity onPress={toggleMenuDrawer}>
            <FontAwesomeIcon icon={faBars} size={20} color={'#ffffff'} />
          </TouchableOpacity>
        </Animated.View>

        <View style={{display: 'flex', alignItems: 'center', marginTop: -25}}>
          <Image source={require('../assets/img/logobig.png')} style={{width: 50, height: 50, resizeMode: 'contain'}} />
        </View>

        {sendPageState.toaddrs.map((ta, i) => {
          return (
            <View key={i} style={{display: 'flex', padding: 10, marginTop: 20}}>
              <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                <FadeText>To</FadeText>
                {addressValidationState[i] === 1 && <FontAwesomeIcon icon={faCheck} color="green" />}
                {addressValidationState[i] === -1 && <ErrorText>Invalid Address!</ErrorText>}
              </View>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  borderBottomColor: colors.card,
                  borderBottomWidth: 2,
                }}>
                <RegTextInput
                  placeholder="z-address or t-address"
                  placeholderTextColor="#777777"
                  style={{flexGrow: 1, maxWidth: '90%'}}
                  value={ta.to}
                  onChangeText={(text: string) => updateToField(i, text, null, null)}
                />
                <TouchableOpacity
                  onPress={() => {
                    setQrcodeModalIndex(i);
                    setQrcodeModalVisible(true);
                  }}>
                  <FontAwesomeIcon style={{margin: 5}} size={24} icon={faQrcode} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={{marginTop: 30, display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                <FadeText>Amount (ZEC)</FadeText>
                {amountValidationState[i] === 1 && (
                  <UsdAmount price={zecPrice} amtZec={Utils.parseLocaleFloat(ta.amount)} />
                )}
                {amountValidationState[i] === -1 && <ErrorText>Invalid Amount!</ErrorText>}
              </View>

              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  borderBottomColor: colors.card,
                  borderBottomWidth: 2,
                }}>
                <RegTextInput
                  placeholder={`0${decimalSeparator}0`}
                  placeholderTextColor="#777777"
                  keyboardType="numeric"
                  style={{flexGrow: 1, maxWidth: '90%'}}
                  value={ta.amount.toString()}
                  onChangeText={(text: string) => updateToField(i, null, text, null)}
                />
                <TouchableOpacity onPress={() => setMaxAmount(i)}>
                  <FontAwesomeIcon style={{margin: 5}} size={24} icon={faArrowAltCircleUp} color={colors.text} />
                </TouchableOpacity>
              </View>
              {stillConfirming && (
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    marginTop: 5,
                    backgroundColor: colors.card,
                    padding: 5,
                    borderRadius: 10,
                  }}>
                  <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} />
                  <FadeText>Some funds are still confirming</FadeText>
                </View>
              )}

              {memoEnabled && (
                <>
                  <FadeText style={{marginTop: 30}}>Memo (Optional)</FadeText>
                  <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start'}}>
                    <RegTextInput
                      multiline
                      style={{flexGrow: 1, borderBottomColor: colors.card, borderBottomWidth: 2}}
                      value={ta.memo}
                      onChangeText={(text: string) => updateToField(i, null, null, text)}
                    />
                  </View>
                </>
              )}
            </View>
          );
        })}

        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            margin: 20,
          }}>
          <PrimaryButton title="Send" disabled={!sendButtonEnabled} onPress={() => setConfirmModalVisible(true)} />
          <SecondaryButton style={{marginTop: 10}} title="Clear" onPress={() => clearToAddrs()} />
        </View>
      </ScrollView>
    </View>
  );
};

export default SendScreen;
