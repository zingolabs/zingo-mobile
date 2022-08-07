/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect, useRef} from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import {View, ScrollView, Modal, Image, Alert, SafeAreaView, Keyboard, Platform, Text} from 'react-native';
import {
  FadeText,
  BoldText,
  ErrorText,
  RegTextInput,
  RegText,
  ZecAmount,
  UsdAmount,
  ClickableText,
} from '../components/Components';
import Button from './Button';
import {Info, SendPageState, SendProgress, ToAddr, TotalBalance} from '../app/AppState';
import {faQrcode, faCheck, faInfo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {useTheme} from '@react-navigation/native';
import {NavigationScreenProp} from 'react-navigation';
import Utils from '../app/utils';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Toast from 'react-native-simple-toast';
import {getNumberFormatSettings} from 'react-native-localize';
import {faBars} from '@fortawesome/free-solid-svg-icons';
import Animated, {EasingNode} from 'react-native-reanimated';
import {parseZcashURI} from '../app/uris';

type ScannerProps = {
  idx: number;
  updateToField: (
    idx: number,
    address: string | null,
    amount: string | null,
    amountUSD: string | null,
    memo: string | null,
  ) => void;
  closeModal: () => void;
};
function ScanScreen({idx, updateToField, closeModal}: ScannerProps) {
  const [error, setError] = useState<String | null>(null);

  const validateAddress = (scannedAddress: string) => {
    if (Utils.isSapling(scannedAddress) || Utils.isTransparent(scannedAddress)) {
      updateToField(idx, scannedAddress, null, null, null);
      closeModal();
    } else {
      // Try to parse as a URI
      if (scannedAddress.startsWith('zcash:')) {
        const targets = parseZcashURI(scannedAddress);

        if (Array.isArray(targets)) {
          updateToField(idx, scannedAddress, null, null, null);
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
            <Button type="Secondary" title="Cancel" onPress={doCancel} />
          </View>
        </View>
      }
    />
  );
}

type ConfirmModalProps = {
  sendPageState: SendPageState;
  defaultFee: number;
  price?: number | null;
  closeModal: () => void;
  confirmSend: () => void;
};
const ConfirmModalContent: React.FunctionComponent<ConfirmModalProps> = ({
  closeModal,
  confirmSend,
  sendPageState,
  price,
  defaultFee,
}) => {
  const {colors} = useTheme();

  const sendingTotal =
    sendPageState.toaddrs.reduce((s, t) => s + Utils.parseLocaleFloat(t.amount || '0'), 0.0) + defaultFee;

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
        {sendPageState.toaddrs.map(to => {
          return (
            <View key={to.id} style={{margin: 10}}>
              <FadeText>To</FadeText>
              <RegText>{Utils.splitStringIntoChunks(to.to, 8).join(' ')}</RegText>

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
            <ZecAmount size={18} amtZec={defaultFee} />
            <UsdAmount style={{fontSize: 18}} amtZec={defaultFee} price={price} />
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
        <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'center'}}>
          <Button type="Primary" title={'Confirm'} onPress={confirmSend} />
          <Button type="Secondary" style={{marginLeft: 20}} title={'Cancel'} onPress={closeModal} />
        </View>
      </View>
    </SafeAreaView>
  );
};

type SendScreenProps = {
  info: Info | null;
  totalBalance: TotalBalance;
  sendPageState: SendPageState;
  setSendPageState: (sendPageState: SendPageState) => void;
  sendTransaction: (setSendProgress: (arg0: SendProgress | null) => void) => void;
  clearToAddrs: () => void;
  navigation: NavigationScreenProp<any>;
  toggleMenuDrawer: () => void;
  setComputingModalVisible: (visible: boolean) => void;
  setTxBuildProgress: (progress: SendProgress) => void;
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
  setComputingModalVisible,
  setTxBuildProgress,
}) => {
  const {colors} = useTheme();
  const [qrcodeModalVisble, setQrcodeModalVisible] = useState(false);
  const [qrcodeModalIndex, setQrcodeModalIndex] = useState(0);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const [titleViewHeight, setTitleViewHeight] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const defaultFee = info?.defaultFee || Utils.getFallbackDefaultFee();

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      Animated.timing(slideAnim, {toValue: 0 - titleViewHeight + 25, duration: 100, easing: EasingNode.linear, useNativeDriver: true}).start();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(slideAnim, {toValue: 0, duration: 100, easing: EasingNode.linear, useNativeDriver: true}).start();
    });

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, [slideAnim, titleViewHeight]);

  const updateToField = (
    idx: number,
    address: string | null,
    amount: string | null,
    amountUSD: string | null,
    memo: string | null,
  ) => {
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
          targets.forEach(tgt => {
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

    const {decimalSeparator} = getNumberFormatSettings();

    if (amount !== null) {
      toAddr.amount = amount.replace(decimalSeparator, '.');
      if (isNaN(toAddr.amount)) {
        toAddr.amountUSD = '';
      } else if (toAddr.amount && info?.zecPrice) {
        toAddr.amountUSD = Utils.toLocaleFloat((parseFloat(toAddr.amount) * (info?.zecPrice || 0)).toFixed(2));
      } else {
        toAddr.amountUSD = '';
      }
    }

    if (amountUSD !== null) {
      toAddr.amountUSD = amountUSD.replace(decimalSeparator, '.');
      if (isNaN(toAddr.amountUSD)) {
        toAddr.amount = '';
      } else if (toAddr.amountUSD && info?.zecPrice) {
        toAddr.amount = Utils.toLocaleFloat(Utils.maxPrecisionTrimmed(parseFloat(amountUSD) / info?.zecPrice));
      } else {
        toAddr.amount = '';
      }
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

    const setSendProgress = (progress: SendProgress | null) => {
      if (progress && progress.sendInProgress) {
        setTxBuildProgress(progress);
      } else {
        setTxBuildProgress(new SendProgress());
      }
    };

    // call the sendTransaction method in a timeout, allowing the modals to show properly
    setTimeout(async () => {
      try {
        const txid = await sendTransaction(setSendProgress);
        setComputingModalVisible(false);

        // Clear the fields
        clearToAddrs();

        navigation.navigate('WALLET');
        setTimeout(() => {
          Toast.show(`Successfully Broadcast Tx: ${txid}`, Toast.LONG);
        }, 1000);
      } catch (err) {
        setTimeout(() => {
          //console.log('sendtx error', err);
          Alert.alert('Error sending Tx', `${err}`, [{text: 'OK', onPress: () => setComputingModalVisible(false)}], {
            cancelable: false,
          });
        }, 1000);
      }
    });
  };

  const spendable = totalBalance.transparentBal + totalBalance.spendablePrivate;
  const stillConfirming = spendable !== totalBalance.total;

  const setMaxAmount = (idx: number) => {
    let max = spendable - defaultFee;
    if (max < 0) {
      max = 0;
    }
    updateToField(idx, null, Utils.maxPrecisionTrimmed(max), null, null);
  };

  const getMaxAmount = (): number => {
    let max = spendable - defaultFee;
    if (max < 0) {
      return 0;
    }
    return max;
  };

  const memoEnabled = Utils.isSapling(sendPageState.toaddrs[0].to);
  const zecPrice = info ? info.zecPrice : null;

  var addressValidationState: number[] = sendPageState.toaddrs.map(to => {
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

  var amountValidationState: number[] = sendPageState.toaddrs.map(to => {
    if (to.amountUSD !== '') {
      if (isNaN(to.amountUSD)) {
        return -1;
      }
    }
    if (to.amount !== '') {
      if (
        Utils.parseLocaleFloat(to.amount) > 0 &&
        Utils.parseLocaleFloat(to.amount) <= parseFloat(getMaxAmount().toFixed(8))
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
    addressValidationState.filter(n => n === 1).length === addressValidationState.length &&
    amountValidationState.filter(n => n === 1).length === amountValidationState.length;

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
          defaultFee={defaultFee}
          price={info?.zecPrice}
          closeModal={() => {
            setConfirmModalVisible(false);
          }}
          confirmSend={confirmSend}
        />
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
            onLayout={e => {
              const {height} = e.nativeEvent.layout;
              setTitleViewHeight(height);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingBottom: 0,
              backgroundColor: colors.card,
              zIndex: -1,
            }}>
            <View
              style={{display: 'flex', alignItems: 'center', paddingBottom: 0, backgroundColor: colors.card, zIndex: -1, paddingTop: 10}}>
              <Image source={require('../assets/img/logobig-zingo.png')} style={{width: 80, height: 80, resizeMode: 'contain'}} />
              <ZecAmount size={36} amtZec={totalBalance.total} />
              <UsdAmount style={{marginTop: 0, marginBottom: 5}} price={zecPrice} amtZec={totalBalance.total} />
              <RegText color={colors.money} style={{marginTop: 5, padding: 5}}>Send</RegText>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={{backgroundColor: colors.card, padding: 10, position: 'absolute', marginTop: slideAnim}}>
          <TouchableOpacity onPress={toggleMenuDrawer}>
            <FontAwesomeIcon icon={faBars} size={20} color={colors.border} />
          </TouchableOpacity>
        </Animated.View>

        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary}}></View>

        {sendPageState.toaddrs.map((ta, i) => {
          return (
            <View key={i} style={{display: 'flex', padding: 10, marginTop: 10}}>
              <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                <RegText>To Address</RegText>
                {addressValidationState[i] === 1 && <FontAwesomeIcon icon={faCheck} color={colors.primary} />}
                {addressValidationState[i] === -1 && <ErrorText>Invalid Address!</ErrorText>}
              </View>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderRadius: 5,
                  borderColor: colors.text,
                  marginTop: 5,
                }}>
                <RegTextInput
                  placeholder="Z or T or O or UA-address"
                  placeholderTextColor={colors.placeholder}
                  style={{flexGrow: 1, maxWidth: '90%'}}
                  value={ta.to}
                  onChangeText={(text: string) => updateToField(i, text, null, null, null)}
                />
                <TouchableOpacity
                  onPress={() => {
                    setQrcodeModalIndex(i);
                    setQrcodeModalVisible(true);
                  }}>
                  <FontAwesomeIcon style={{margin: 5}} size={24} icon={faQrcode} color={colors.border} />
                </TouchableOpacity>
              </View>

              <View style={{marginTop: 10, display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
                <FadeText>Amount</FadeText>
                {amountValidationState[i] === -1 && <ErrorText>Invalid Amount!</ErrorText>}
              </View>

              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                }}>
                <RegText style={{marginTop: 20, marginRight: 5, fontSize: 20}}>{'\u1647'}</RegText>
                <RegTextInput
                  placeholder={`0${decimalSeparator}0`}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderRadius: 5,
                    borderColor: colors.text,
                    marginTop: 5,
                    fontSize: 18,
                    width: '42%',
                  }}
                  value={ta.amount.toString()}
                  onChangeText={(text: string) => updateToField(i, null, text, null, null)}
                />
                <RegText style={{marginTop: 15, marginRight: 10, marginLeft: 5}}>ZEC</RegText>

                <RegText style={{marginTop: 15, marginLeft: 10, marginRight: 5}}>$</RegText>
                <RegTextInput
                  placeholder={`0${decimalSeparator}0`}
                  placeholderTextColor={colors.placeholder}
                  keyboardType="numeric"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderRadius: 5,
                    borderColor: colors.text,
                    marginTop: 5,
                    fontSize: 18,
                    width: '25%',
                  }}
                  value={ta.amountUSD.toString()}
                  onChangeText={(text: string) => updateToField(i, null, null, text, null)}
                />
                <RegText style={{marginTop: 15, marginLeft: 5}}>USD</RegText>
              </View>

              <View style={{display: 'flex', flexDirection: 'column'}}>
                <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 10}}>
                  <RegText>Spendable: </RegText>
                  <ZecAmount color={colors.money} size={18} amtZec={getMaxAmount()} />
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
                    <FadeText>Some funds still confirming</FadeText>
                  </View>
                )}
              </View>

              {memoEnabled && (
                <>
                  <FadeText style={{marginTop: 30}}>Memo (Optional)</FadeText>
                  <View style={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-start'}}>
                    <RegTextInput
                      multiline
                      style={{
                        flexGrow: 1,
                        borderBottomColor:
                        colors.card,
                        borderBottomWidth: 2
                      }}
                      value={ta.memo}
                      onChangeText={(text: string) => updateToField(i, null, null, null, text)}
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
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            margin: 20,
          }}>
          <Button type="Primary" title="Send" disabled={!sendButtonEnabled} onPress={() => setConfirmModalVisible(true)} />
          <Button type="Secondary" style={{marginLeft: 10}} title="Clear" onPress={() => clearToAddrs()} />
        </View>
      </ScrollView>
    </View>
  );
};

export default SendScreen;
