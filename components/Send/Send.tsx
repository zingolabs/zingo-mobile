/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, Modal, Image, Alert, Keyboard } from 'react-native';
import { faQrcode, faCheck, faInfo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useTheme } from '@react-navigation/native';
import { NavigationScreenProp } from 'react-navigation';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Toast from 'react-native-simple-toast';
import { getNumberFormatSettings } from 'react-native-localize';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import Animated, { EasingNode } from 'react-native-reanimated';

import FadeText from '../Components/FadeText';
import ErrorText from '../Components/ErrorText';
import RegTextInput from '../Components/RegTextInput';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import UsdAmount from '../Components/UsdAmount';
import Button from '../Button';
import { InfoType, SendPageState, SendProgress, ToAddr, TotalBalance, SyncStatus } from '../../app/AppState';
import { parseZcashURI } from '../../app/uris';
import RPCModule from '../RPCModule';
import Utils from '../../app/utils';
import Scanner from './components/Scanner';
import Confirm from './components/Confirm';
import { ThemeType } from '../../app/types';

type SendProps = {
  info: InfoType | null;
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
  syncingStatusMoreInfoOnClick: () => void;
  inRefresh: boolean;
};

const Send: React.FunctionComponent<SendProps> = ({
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
  inRefresh,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;
  const [qrcodeModalVisble, setQrcodeModalVisible] = useState(false);
  const [qrcodeModalIndex, setQrcodeModalIndex] = useState(0);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [titleViewHeight, setTitleViewHeight] = useState(0);
  const [memoEnabled, setMemoEnabled] = useState(false);
  const [validAddress, setValidAddress] = useState(0); // 1 - OK, 0 - Empty, -1 - KO
  const [validAmount, setValidAmount] = useState(0); // 1 - OK, 0 - Empty, -1 - KO
  const [sendButtonEnabled, setSendButtonEnabled] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const defaultFee = info?.defaultFee || Utils.getFallbackDefaultFee();
  const { decimalSeparator } = getNumberFormatSettings();
  const syncStatusDisplayLine = syncingStatus?.inProgress ? `(${syncingStatus?.blocks})` : '';
  const spendable = totalBalance.transparentBal + totalBalance.spendablePrivate + totalBalance.spendableOrchard;
  const stillConfirming = spendable !== totalBalance.total || inRefresh;
  const zecPrice = info ? info.zecPrice : null;
  const currencyName = info ? info.currencyName : undefined;

  const getMaxAmount = useCallback((): number => {
    let max = spendable - defaultFee;
    if (max < 0) {
      return 0;
    }
    return max;
  }, [spendable, defaultFee]);

  useEffect(() => {
    const getMemoEnabled = async (address: string): Promise<boolean> => {
      const result = await RPCModule.execute('parse', address);
      const resultJSON = await JSON.parse(result);

      //console.log('parse-memo', address, resultJSON);

      return (
        resultJSON.status === 'success' &&
        resultJSON.address_kind !== 'transparent' &&
        ((currencyName === 'ZEC' &&
          (resultJSON.chain_name.toLowerCase() === 'main' || resultJSON.chain_name.toLowerCase() === 'mainnet')) ||
          (currencyName !== 'ZEC' &&
            (resultJSON.chain_name.toLowerCase() === 'test' ||
              resultJSON.chain_name.toLowerCase() === 'testnet' ||
              resultJSON.chain_name.toLowerCase() === 'regtest')))
      );
    };

    const address = sendPageState.toaddrs[0].to;

    if (address) {
      getMemoEnabled(address).then(r => {
        setMemoEnabled(r);
      });
    } else {
      setMemoEnabled(false);
    }
  }, [sendPageState.toaddrs, currencyName]);

  useEffect(() => {
    const parseAdressJSON = async (address: string): Promise<boolean> => {
      const result = await RPCModule.execute('parse', address);
      const resultJSON = await JSON.parse(result);

      //console.log('parse-address', address, resultJSON.status === 'success');

      return (
        resultJSON.status === 'success' &&
        ((currencyName === 'ZEC' &&
          (resultJSON.chain_name.toLowerCase() === 'main' || resultJSON.chain_name.toLowerCase() === 'mainnet')) ||
          (currencyName !== 'ZEC' &&
            (resultJSON.chain_name.toLowerCase() === 'test' ||
              resultJSON.chain_name.toLowerCase() === 'testnet' ||
              resultJSON.chain_name.toLowerCase() === 'regtest')))
      );
    };

    const address = sendPageState.toaddrs[0].to;

    if (address) {
      parseAdressJSON(address).then(r => {
        setValidAddress(r ? 1 : -1);
      });
    } else {
      setValidAddress(0);
    }

    var to = sendPageState.toaddrs[0];
    to.amount = to.amount.replace(decimalSeparator, '.');
    to.amountUSD = to.amountUSD.replace(decimalSeparator, '.');

    if (to.amountUSD !== '') {
      if (isNaN(Number(to.amountUSD))) {
        setValidAmount(-1);
      }
    }
    if (to.amount !== '') {
      if (isNaN(Number(to.amount))) {
        setValidAmount(-1);
      } else {
        if (
          Utils.parseLocaleFloat(Number(to.amount).toFixed(8).toString()) > 0 &&
          Utils.parseLocaleFloat(Number(to.amount).toFixed(8).toString()) <=
            Utils.parseLocaleFloat(getMaxAmount().toFixed(8))
        ) {
          setValidAmount(1);
        } else {
          setValidAmount(-1);
        }
      }
    } else {
      setValidAmount(0);
    }
  }, [sendPageState.toaddrs, getMaxAmount, decimalSeparator, currencyName]);

  useEffect(() => {
    setSendButtonEnabled(validAddress === 1 && validAmount === 1 && !inRefresh);
  }, [validAddress, validAmount, inRefresh]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      Animated.timing(slideAnim, {
        toValue: 0 - titleViewHeight + 25,
        duration: 100,
        easing: EasingNode.linear,
        //useNativeDriver: true,
      }).start();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 100,
        easing: EasingNode.linear,
        //useNativeDriver: true,
      }).start();
    });

    return () => {
      !!keyboardDidShowListener && keyboardDidShowListener.remove();
      !!keyboardDidHideListener && keyboardDidHideListener.remove();
    };
  }, [slideAnim, titleViewHeight]);

  const updateToField = async (
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
        const targets = await parseZcashURI(address);
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

    if (amount !== null) {
      toAddr.amount = amount.replace(decimalSeparator, '.');
      if (isNaN(Number(toAddr.amount))) {
        toAddr.amountUSD = '';
      } else if (toAddr.amount && info?.zecPrice) {
        toAddr.amountUSD = Utils.toLocaleFloat((parseFloat(toAddr.amount) * (info?.zecPrice || 0)).toFixed(2));
      } else {
        toAddr.amountUSD = '';
      }
      toAddr.amount = toAddr.amount.replace('.', decimalSeparator);
    }

    if (amountUSD !== null) {
      toAddr.amountUSD = amountUSD.replace(decimalSeparator, '.');
      if (isNaN(Number(toAddr.amountUSD))) {
        toAddr.amount = '';
      } else if (toAddr.amountUSD && info?.zecPrice) {
        toAddr.amount = Utils.toLocaleFloat(Utils.maxPrecisionTrimmed(parseFloat(amountUSD) / info?.zecPrice));
      } else {
        toAddr.amount = '';
      }
      toAddr.amountUSD = toAddr.amountUSD.replace('.', decimalSeparator);
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
        <Scanner idx={qrcodeModalIndex} updateToField={updateToField} closeModal={() => setQrcodeModalVisible(false)} />
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}>
        <Confirm
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
                {validAddress === 1 && <FontAwesomeIcon icon={faCheck} color={colors.primary} />}
                {validAddress === -1 && <ErrorText>Invalid Address!</ErrorText>}
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
                {validAmount === -1 && <ErrorText>Invalid Amount!</ErrorText>}
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
                    <FadeText>Some funds still confirming or syncing</FadeText>
                  </View>
                )}
              </View>

              {memoEnabled === true && (
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

export default Send;
