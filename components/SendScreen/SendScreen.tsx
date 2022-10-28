/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Modal, Image, Alert, Keyboard } from 'react-native';
import { FadeText, ErrorText, RegTextInput, RegText, ZecAmount, UsdAmount } from '../Components';
import Button from '../Button';
import { Info, SendPageState, SendProgress, ToAddr, TotalBalance } from '../../app/AppState';
import { faQrcode, faCheck, faInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useTheme } from '@react-navigation/native';
import { NavigationScreenProp } from 'react-navigation';
import Utils from '../../app/utils';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Toast from 'react-native-simple-toast';
import { getNumberFormatSettings } from 'react-native-localize';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import Animated, { EasingNode } from 'react-native-reanimated';
import { parseZcashURI } from '../../app/uris';
import RPCModule from '../RPCModule';

import ScannerScreen from './components/ScannerScreen';
import ConfirmModal from './components/ConfirmModal';

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
  syncingStatus: SyncStatus | null;
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
  syncingStatus,
  syncingStatusMoreInfoOnClick,
}) => {
  const { colors } = useTheme();
  const [qrcodeModalVisble, setQrcodeModalVisible] = useState(false);
  const [qrcodeModalIndex, setQrcodeModalIndex] = useState(0);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const [titleViewHeight, setTitleViewHeight] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const defaultFee = info?.defaultFee || Utils.getFallbackDefaultFee();

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      Animated.timing(slideAnim, {
        toValue: 0 - titleViewHeight + 25,
        duration: 100,
        easing: EasingNode.linear,
        useNativeDriver: true,
      }).start();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 100,
        easing: EasingNode.linear,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      !!keyboardDidShowListener && keyboardDidShowListener.remove();
      !!keyboardDidHideListener && keyboardDidHideListener.remove();
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

    const { decimalSeparator } = getNumberFormatSettings();

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
          Alert.alert('Error sending Tx', `${err}`, [{ text: 'OK', onPress: () => setComputingModalVisible(false) }], {
            cancelable: false,
          });
        }, 1000);
      }
    });
  };

  const spendable = totalBalance.transparentBal + totalBalance.spendablePrivate + totalBalance.spendableOrchard;
  const stillConfirming = spendable !== totalBalance.total;

  const getMaxAmount = (): number => {
    let max = spendable - defaultFee;
    if (max < 0) {
      return 0;
    }
    return max;
  };

  const getMemoEnabled = async (address): boolean => {
    if (address) {
      const result = await RPCModule.execute('parse', address);
      console.log(result);
      const resultJSON = await JSON.parse(result);

      console.log('parse-2', sendPageState.toaddrs[0].to, resultJSON);

      return (
        resultJSON.status === 'success' &&
        (resultJSON.address_kind === 'unified' ||
          resultJSON.address_kind === 'orchard' ||
          resultJSON.address_kind === 'sapling')
      );
    } else {
      return false;
    }
  };

  const memoEnabled = getMemoEnabled(sendPageState.toaddrs[0].to);
  const zecPrice = info ? info.zecPrice : null;
  const currencyName = info ? info.currencyName : null;

  var addressValidationState: number[] = sendPageState.toaddrs.map(async to => {
    if (!!to && !!to.to) {
      const result = await RPCModule.execute('parse', to.to);
      console.log(result);
      const resultJSON = await JSON.parse(result);

      console.log('parse-3', to.to, resultJSON);

      const valid = resultJSON.status === 'success';

      if (valid) {
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

  const { decimalSeparator } = getNumberFormatSettings();

  const syncStatusDisplayLine = syncingStatus?.inProgress ? `(${syncingStatus?.blocks})` : '';

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
        <ScannerScreen
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
        <ConfirmModal
          sendPageState={sendPageState}
          defaultFee={defaultFee}
          price={info?.zecPrice}
          closeModal={() => {
            setConfirmModalVisible(false);
          }}
          confirmSend={confirmSend}
          currencyName={currencyName}
        />
      </Modal>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
        }}>
        <Animated.View style={{ marginTop: slideAnim }}>
          <View
            onLayout={e => {
              const { height } = e.nativeEvent.layout;
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
              style={{
                display: 'flex',
                alignItems: 'center',
                paddingBottom: 0,
                backgroundColor: colors.card,
                zIndex: -1,
                paddingTop: 10,
              }}>
              <Image
                source={require('../../assets/img/logobig-zingo.png')}
                style={{ width: 80, height: 80, resizeMode: 'contain' }}
              />
              <ZecAmount currencyName={currencyName} size={36} amtZec={totalBalance.total} />
              <UsdAmount style={{ marginTop: 0, marginBottom: 5 }} price={zecPrice} amtZec={totalBalance.total} />

              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
                  {syncStatusDisplayLine ? 'Send - Syncing' : 'Send'}
                </RegText>
                <FadeText style={{ marginTop: 5, padding: 0 }}>
                  {syncStatusDisplayLine ? syncStatusDisplayLine : ''}
                </FadeText>
                {!!syncStatusDisplayLine && (
                  <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: 5,
                        backgroundColor: colors.card,
                        padding: 5,
                        borderRadius: 10,
                      }}>
                      <FadeText style={{ color: colors.primary }}>more...</FadeText>
                      <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={{ backgroundColor: colors.card, padding: 10, position: 'absolute', marginTop: slideAnim }}>
          <TouchableOpacity onPress={toggleMenuDrawer}>
            <FontAwesomeIcon icon={faBars} size={20} color={colors.border} />
          </TouchableOpacity>
        </Animated.View>

        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />

        {sendPageState.toaddrs.map((ta, i) => {
          return (
            <View key={i} style={{ display: 'flex', padding: 10, marginTop: 10 }}>
              <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
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
                  placeholder="Z-Sapling or T-Transparent or Unified address"
                  placeholderTextColor={colors.placeholder}
                  style={{ flexGrow: 1, maxWidth: '90%' }}
                  value={ta.to}
                  onChangeText={(text: string) => updateToField(i, text, null, null, null)}
                />
                <TouchableOpacity
                  onPress={() => {
                    setQrcodeModalIndex(i);
                    setQrcodeModalVisible(true);
                  }}>
                  <FontAwesomeIcon style={{ margin: 5 }} size={24} icon={faQrcode} color={colors.border} />
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <FadeText>{'   Amount'}</FadeText>
                {amountValidationState[i] === -1 && <ErrorText>Invalid Amount!</ErrorText>}
              </View>

              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    width: '60%',
                  }}>
                  <RegText style={{ marginTop: 20, marginRight: 5, fontSize: 20 }}>{'\u1647'}</RegText>
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
                      width: '75%',
                    }}
                    value={ta.amount.toString()}
                    onChangeText={(text: string) => updateToField(i, null, text, null, null)}
                  />
                  <RegText style={{ marginTop: 15, marginRight: 10, marginLeft: 5 }}>ZEC</RegText>
                </View>

                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    width: '35%',
                  }}>
                  <RegText style={{ marginTop: 15, marginRight: 5 }}>$</RegText>
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
                      width: '55%',
                    }}
                    value={ta.amountUSD.toString()}
                    onChangeText={(text: string) => updateToField(i, null, null, text, null)}
                  />
                  <RegText style={{ marginTop: 15, marginLeft: 5 }}>USD</RegText>
                </View>
              </View>

              <View style={{ display: 'flex', flexDirection: 'column' }}>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    marginTop: 10,
                  }}>
                  <RegText>Spendable: </RegText>
                  <ZecAmount currencyName={currencyName} color={colors.money} size={18} amtZec={getMaxAmount()} />
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
                  <FadeText style={{ marginTop: 30 }}>Memo (Optional)</FadeText>
                  <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start' }}>
                    <RegTextInput
                      multiline
                      style={{
                        flexGrow: 1,
                        borderWidth: 1,
                        borderRadius: 5,
                        borderColor: colors.text,
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
          <Button
            type="Primary"
            title="Send"
            disabled={!sendButtonEnabled}
            onPress={() => setConfirmModalVisible(true)}
          />
          <Button type="Secondary" style={{ marginLeft: 10 }} title="Clear" onPress={() => clearToAddrs()} />
        </View>
      </ScrollView>
    </View>
  );
};

export default SendScreen;
