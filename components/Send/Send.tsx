/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { View, ScrollView, Modal, Keyboard, TextInput, TouchableOpacity, Platform } from 'react-native';
import { faQrcode, faCheck, faInfoCircle, faAddressCard } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useTheme, useIsFocused } from '@react-navigation/native';
import { getNumberFormatSettings } from 'react-native-localize';
import Animated, { EasingNode } from 'react-native-reanimated';
import CheckBox from '@react-native-community/checkbox';
import RNPickerSelect from 'react-native-picker-select';

import FadeText from '../Components/FadeText';
import ErrorText from '../Components/ErrorText';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import CurrencyAmount from '../Components/CurrencyAmount';
import Button from '../Components/Button';
import { AddressBookFileClass, SendPageStateClass, SendProgressClass, ToAddrClass } from '../../app/AppState';
import { parseZcashURI, ZcashURITargetClass } from '../../app/uris';
import RPCModule from '../../app/RPCModule';
import Utils from '../../app/utils';
import ScannerAddress from './components/ScannerAddress';
import Confirm from './components/Confirm';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import PriceFetcher from '../Components/PriceFetcher';
import RPC from '../../app/rpc';
import Header from '../Header';
import { RPCParseAddressType } from '../../app/rpc/types/RPCParseAddressType';
import { createAlert } from '../../app/createAlert';
import AddressItem from '../Components/AddressItem';

type SendProps = {
  setSendPageState: (sendPageState: SendPageStateClass) => void;
  sendTransaction: (setSendProgress: (arg0: SendProgressClass) => void) => Promise<String>;
  clearToAddr: () => void;
  setSendProgress: (progress: SendProgressClass) => void;
  toggleMenuDrawer: () => void;
  setComputingModalVisible: (visible: boolean) => void;
  syncingStatusMoreInfoOnClick: () => void;
  poolsMoreInfoOnClick: () => void;
  setZecPrice: (p: number, d: number) => void;
  set_privacy_option: (name: 'privacy', value: boolean) => Promise<void>;
  setPoolsToShieldSelectSapling: (v: boolean) => void;
  setPoolsToShieldSelectTransparent: (v: boolean) => void;
};

const Send: React.FunctionComponent<SendProps> = ({
  setSendPageState,
  sendTransaction,
  clearToAddr,
  setSendProgress,
  toggleMenuDrawer,
  setComputingModalVisible,
  syncingStatusMoreInfoOnClick,
  poolsMoreInfoOnClick,
  setZecPrice,
  set_privacy_option,
  setPoolsToShieldSelectSapling,
  setPoolsToShieldSelectTransparent,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    info,
    totalBalance,
    sendPageState,
    navigation,
    zecPrice,
    sendAll,
    netInfo,
    privacy,
    server,
    setBackgroundError,
    addLastSnackbar,
    mode,
    someUnconfirmed,
    addressBook,
  } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [qrcodeModalVisble, setQrcodeModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [titleViewHeight, setTitleViewHeight] = useState(0);
  const [memoEnabled, setMemoEnabled] = useState(false);
  const [validAddress, setValidAddress] = useState(0); // 1 - OK, 0 - Empty, -1 - KO
  const [validAmount, setValidAmount] = useState(0); // 1 - OK, 0 - Empty, -1 - KO
  const [sendButtonEnabled, setSendButtonEnabled] = useState(false);
  const [itemsPicker, setItemsPicker] = useState([] as { label: string; value: string }[]);
  const isFocused = useIsFocused();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const defaultFee = info.defaultFee || Utils.getFallbackDefaultFee();
  const { decimalSeparator } = getNumberFormatSettings();
  // transparent is not spendable.
  const spendable = totalBalance.spendablePrivate + totalBalance.spendableOrchard;

  const stillConfirming =
    totalBalance.orchardBal !== totalBalance.spendableOrchard ||
    totalBalance.privateBal !== totalBalance.spendablePrivate ||
    someUnconfirmed;
  const showShieldInfo =
    totalBalance &&
    (someUnconfirmed ? 0 : totalBalance.transparentBal) > 0 &&
    (someUnconfirmed ? 0 : totalBalance.transparentBal) + totalBalance.spendablePrivate > info.defaultFee;
  const showUpgradeInfo =
    totalBalance &&
    (someUnconfirmed ? 0 : totalBalance.transparentBal) === 0 &&
    totalBalance.spendablePrivate > info.defaultFee;

  const getMaxAmount = useCallback((): number => {
    let max = spendable - defaultFee;
    if (max < 0) {
      return 0;
    }
    return max;
  }, [spendable, defaultFee]);

  useEffect(() => {
    const getMemoEnabled = async (address: string): Promise<boolean> => {
      if (!netInfo.isConnected) {
        addLastSnackbar({ message: translate('loadedapp.connection-error') as string, type: 'Primary' });
        return false;
      }
      const result: string = await RPCModule.execute('parse_address', address);
      if (result) {
        if (result.toLowerCase().startsWith('error') || result.toLowerCase() === 'null') {
          return false;
        }
      } else {
        return false;
      }
      let resultJSON = {} as RPCParseAddressType;
      try {
        resultJSON = await JSON.parse(result);
      } catch (e) {
        return false;
      }

      //console.log('parse-memo', address, resultJSON);

      return (
        resultJSON.status === 'success' &&
        resultJSON.address_kind !== 'transparent' &&
        resultJSON.chain_name === server.chain_name
      );
    };

    const address = sendPageState.toaddr.to;

    if (address) {
      getMemoEnabled(address).then(r => {
        setMemoEnabled(r);
      });
    } else {
      setMemoEnabled(false);
    }
  }, [server.chain_name, netInfo.isConnected, sendPageState.toaddr.to, translate, addLastSnackbar]);

  useEffect(() => {
    const parseAdressJSON = async (address: string): Promise<boolean> => {
      if (!netInfo.isConnected) {
        addLastSnackbar({ message: translate('loadedapp.connection-error') as string, type: 'Primary' });
        return false;
      }
      const result: string = await RPCModule.execute('parse_address', address);
      if (result) {
        if (result.toLowerCase().startsWith('error') || result.toLowerCase() === 'null') {
          return false;
        }
      } else {
        return false;
      }
      let resultJSON = {} as RPCParseAddressType;
      try {
        resultJSON = await JSON.parse(result);
      } catch (e) {
        return false;
      }

      //console.log('parse-address', address, resultJSON.status === 'success');

      return resultJSON.status === 'success' && resultJSON.chain_name === server.chain_name;
    };

    var to = sendPageState.toaddr;

    if (to.to) {
      parseAdressJSON(to.to).then(r => {
        setValidAddress(r ? 1 : -1);
      });
    } else {
      setValidAddress(0);
    }

    to.amount = to.amount.replace(decimalSeparator, '.');
    to.amountCurrency = to.amountCurrency.replace(decimalSeparator, '.');

    let invalid = false;
    if (to.amountCurrency !== '') {
      if (isNaN(Number(to.amountCurrency))) {
        setValidAmount(-1);
        invalid = true;
      }
    }
    if (!invalid) {
      if (to.amount !== '') {
        if (isNaN(Number(to.amount))) {
          setValidAmount(-1);
        } else {
          if (
            Utils.parseLocaleFloat(Number(to.amount).toFixed(8)) >= 0 &&
            Utils.parseLocaleFloat(Number(to.amount).toFixed(8)) <= Utils.parseLocaleFloat(getMaxAmount().toFixed(8))
          ) {
            setValidAmount(1);
          } else {
            setValidAmount(-1);
          }
        }
      } else {
        setValidAmount(0);
      }
    }
  }, [
    decimalSeparator,
    getMaxAmount,
    server.chain_name,
    netInfo.isConnected,
    sendPageState.toaddr,
    sendPageState.toaddr.to,
    sendPageState.toaddr.amountCurrency,
    sendPageState.toaddr.amount,
    translate,
    addLastSnackbar,
  ]);

  useEffect(() => {
    setSendButtonEnabled(validAddress === 1 && validAmount === 1);
  }, [validAddress, validAmount]);

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

  useEffect(() => {
    (async () => {
      if (mode === 'basic') {
        const price = await RPC.rpc_getZecPrice();
        // values:
        // 0   - initial/default value
        // -1  - error in Gemini/zingolib.
        // -2  - error in RPCModule, likely.
        // > 0 - real value
        if (price <= 0) {
          setZecPrice(price, 0);
        } else {
          setZecPrice(price, Date.now());
        }
      }
    })();
  }, [mode, setZecPrice]);

  useEffect(() => {
    const items = addressBook.map((item: AddressBookFileClass) => ({
      label: item.label,
      value: item.address,
    }));
    setItemsPicker(items);
  }, [addressBook]);

  const updateToField = async (
    address: string | null,
    amount: string | null,
    amountCurrency: string | null,
    memo: string | null,
    includeUAMemo: boolean | null,
  ) => {
    // Create the new state object
    const newState = new SendPageStateClass(new ToAddrClass(0));

    const newToAddr = sendPageState.toaddr;
    // Find the correct toAddr
    const toAddr = newToAddr;

    if (address !== null) {
      toAddr.to = address;
      // Attempt to parse as URI if it starts with zcash
      if (address.toLowerCase().startsWith('zcash:')) {
        const target: string | ZcashURITargetClass = await parseZcashURI(address, translate, server);
        //console.log(target);

        if (typeof target !== 'string') {
          // redo the to addresses
          [target].forEach(tgt => {
            toAddr.to = tgt.address || '';
            toAddr.amount = Utils.maxPrecisionTrimmed(tgt.amount || 0);
            toAddr.memo = tgt.memoString || '';
          });
        } else {
          // Show the error message as a toast
          addLastSnackbar({ message: target, type: 'Primary' });
          //return;
        }
      } else {
        toAddr.to = address.replace(/[ \t\n\r]+/g, ''); // Remove spaces
      }
    }

    if (amount !== null) {
      toAddr.amount = amount.replace(decimalSeparator, '.').substring(0, 20);
      if (isNaN(Number(toAddr.amount))) {
        toAddr.amountCurrency = '';
      } else if (toAddr.amount && zecPrice && zecPrice.zecPrice > 0) {
        toAddr.amountCurrency = Utils.toLocaleFloat((parseFloat(toAddr.amount) * zecPrice.zecPrice).toFixed(2));
      } else {
        toAddr.amountCurrency = '';
      }
      toAddr.amount = toAddr.amount.replace('.', decimalSeparator);
    }

    if (amountCurrency !== null) {
      toAddr.amountCurrency = amountCurrency.replace(decimalSeparator, '.').substring(0, 15);
      if (isNaN(Number(toAddr.amountCurrency))) {
        toAddr.amount = '';
      } else if (toAddr.amountCurrency && zecPrice && zecPrice.zecPrice > 0) {
        toAddr.amount = Utils.toLocaleFloat(Utils.maxPrecisionTrimmed(parseFloat(amountCurrency) / zecPrice.zecPrice));
      } else {
        toAddr.amount = '';
      }
      toAddr.amountCurrency = toAddr.amountCurrency.replace('.', decimalSeparator);
    }

    if (memo !== null) {
      toAddr.memo = memo;
    }

    if (includeUAMemo !== null) {
      toAddr.includeUAMemo = includeUAMemo;
    }

    newState.toaddr = newToAddr;
    setSendPageState(newState);
  };

  const confirmSend = async () => {
    if (!netInfo.isConnected) {
      setConfirmModalVisible(false);
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string, type: 'Primary' });
      return;
    }
    // very first interrupt syncing Just in case...
    await RPC.rpc_setInterruptSyncAfterBatch('true');
    // First, close the confirm modal and show the "computing" modal
    setConfirmModalVisible(false);
    setComputingModalVisible(true);

    const setLocalSendProgress = (progress: SendProgressClass) => {
      if (progress && progress.sendInProgress) {
        setSendProgress(progress);
      } else {
        setSendProgress(new SendProgressClass(0, 0, 0));
      }
    };

    // call the sendTransaction method in a timeout, allowing the modals to show properly
    setTimeout(async () => {
      try {
        const txid = await sendTransaction(setLocalSendProgress);
        setComputingModalVisible(false);

        // Clear the fields
        clearToAddr();

        if (navigation) {
          navigation.navigate(translate('loadedapp.wallet-menu') as string);
        }

        createAlert(
          setBackgroundError,
          addLastSnackbar,
          translate('send.confirm-title') as string,
          `${translate('send.Broadcast')} ${txid}`,
          true,
        );
      } catch (err) {
        setComputingModalVisible(false);
        const error = err as string;

        let customError = '';
        if (
          error.includes('18: bad-txns-sapling-duplicate-nullifier') ||
          error.includes('18: bad-txns-sprout-duplicate-nullifier') ||
          error.includes('18: bad-txns-orchard-duplicate-nullifier')
        ) {
          // bad-txns-xxxxxxxxx-duplicate-nullifier (3 errors)
          customError = translate('send.duplicate-nullifier-error') as string;
        } else if (error.includes('64: dust')) {
          // dust
          customError = translate('send.dust-error') as string;
        }

        setTimeout(() => {
          //console.log('sendtx error', error);
          // if the App is in background I need to store the error
          // and when the App come back to foreground shows it to the user.
          createAlert(
            setBackgroundError,
            addLastSnackbar,
            translate('send.sending-error') as string,
            `${customError ? customError : error}`,
          );
        }, 1000);
      }
    });
  };

  useEffect(() => {
    (async () => {
      if (isFocused) {
        await RPC.rpc_setInterruptSyncAfterBatch('true');
      } else {
        await RPC.rpc_setInterruptSyncAfterBatch('false');
      }
    })();
  }, [isFocused]);

  //console.log('render Send - 4');

  const returnPage = (
    <View
      accessible={true}
      accessibilityLabel={translate('send.title-acc') as string}
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        marginBottom: 200,
      }}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={qrcodeModalVisble}
        onRequestClose={() => setQrcodeModalVisible(false)}>
        <ScannerAddress
          setAddress={(a: string) => {
            updateToField(a, null, null, null, null);
          }}
          closeModal={() => setQrcodeModalVisible(false)}
        />
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}>
        <Confirm
          defaultFee={defaultFee}
          closeModal={() => {
            setConfirmModalVisible(false);
          }}
          confirmSend={confirmSend}
          sendAllAmount={
            mode !== 'basic' &&
            Number(sendPageState.toaddr.amount) === Utils.parseLocaleFloat(getMaxAmount().toFixed(8))
          }
        />
      </Modal>

      <Animated.View style={{ marginTop: slideAnim }}>
        <View
          onLayout={e => {
            const { height } = e.nativeEvent.layout;
            setTitleViewHeight(height);
          }}>
          <Header
            poolsMoreInfoOnClick={poolsMoreInfoOnClick}
            syncingStatusMoreInfoOnClick={syncingStatusMoreInfoOnClick}
            toggleMenuDrawer={toggleMenuDrawer}
            setZecPrice={setZecPrice}
            title={translate('send.title') as string}
            setComputingModalVisible={setComputingModalVisible}
            setBackgroundError={setBackgroundError}
            set_privacy_option={set_privacy_option}
            setPoolsToShieldSelectSapling={setPoolsToShieldSelectSapling}
            setPoolsToShieldSelectTransparent={setPoolsToShieldSelectTransparent}
            addLastSnackbar={addLastSnackbar}
          />
        </View>
      </Animated.View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{}} testID="send.scroll-view">
        <View style={{ marginBottom: 30 }}>
          {[sendPageState.toaddr].map((ta, i) => {
            return (
              <View key={i} style={{ display: 'flex', padding: 10, marginTop: 10 }}>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ display: 'flex', flexDirection: 'row' }}>
                    <RegText style={{ marginRight: 10 }}>{translate('send.toaddress') as string}</RegText>
                    {validAddress === 1 && (
                      <AddressItem address={ta.to} oneLine={true} onlyContact={true} withIcon={true} />
                    )}
                  </View>
                  {validAddress === 1 && <FontAwesomeIcon icon={faCheck} color={colors.primary} />}
                  {validAddress === -1 && <ErrorText>{translate('send.invalidaddress') as string}</ErrorText>}
                </View>
                <View
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderRadius: 5,
                    borderColor: colors.text,
                    marginTop: 5,
                  }}>
                  <View style={{ flexDirection: 'row' }}>
                    <View
                      accessible={true}
                      accessibilityLabel={translate('send.address-acc') as string}
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                      }}>
                      <TextInput
                        testID="send.addressplaceholder"
                        placeholder={translate('send.addressplaceholder') as string}
                        placeholderTextColor={colors.placeholder}
                        style={{
                          color: colors.text,
                          fontWeight: '600',
                          fontSize: 16,
                          marginLeft: 5,
                          backgroundColor: 'transparent',
                        }}
                        value={ta.to}
                        onChangeText={(text: string) => updateToField(text, null, null, null, null)}
                        editable={true}
                      />
                    </View>
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: 95,
                      }}>
                      <RNPickerSelect
                        value={ta.to}
                        items={itemsPicker}
                        placeholder={{ label: translate('addressbook.select-placeholder') as string, value: '' }}
                        onValueChange={(itemValue: string) => {
                          updateToField(itemValue, null, null, null, null);
                        }}>
                        <FontAwesomeIcon
                          style={{ margin: 5 }}
                          size={38}
                          icon={faAddressCard}
                          color={colors.primaryDisabled}
                        />
                      </RNPickerSelect>
                      <TouchableOpacity
                        testID="send.scan-button"
                        accessible={true}
                        accessibilityLabel={translate('send.scan-acc') as string}
                        onPress={() => {
                          setQrcodeModalVisible(true);
                        }}>
                        <FontAwesomeIcon style={{ margin: 5 }} size={38} icon={faQrcode} color={colors.border} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 10, display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', minWidth: 48, minHeight: 48 }}>
                    <View
                      style={{
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        borderRadius: 10,
                        margin: 0,
                        padding: 0,
                        paddingBottom: 3,
                        minWidth: 48,
                        minHeight: 48,
                      }}>
                      <FadeText>{`${translate('send.amount')}`}</FadeText>
                    </View>
                    {sendAll && mode !== 'basic' && (
                      <TouchableOpacity
                        onPress={() =>
                          updateToField(
                            null,
                            Utils.parseLocaleFloat(getMaxAmount().toFixed(8)).toString(),
                            null,
                            null,
                            null,
                          )
                        }>
                        <View
                          style={{
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            borderRadius: 10,
                            margin: 0,
                            padding: 0,
                            marginLeft: 10,
                            minWidth: 48,
                            minHeight: 48,
                          }}>
                          <RegText color={colors.primary}>{translate('send.sendall') as string}</RegText>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                  {validAmount === -1 && <ErrorText>{translate('send.invalidamount') as string}</ErrorText>}
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
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      width: '60%',
                    }}>
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                      }}>
                      <RegText style={{ marginTop: 22, marginRight: 5, fontSize: 20, transform: [{ scaleY: 1.5 }] }}>
                        {'\u1647'}
                      </RegText>
                      <View
                        accessible={true}
                        accessibilityLabel={translate('send.zec-acc') as string}
                        style={{
                          flexGrow: 1,
                          borderWidth: 1,
                          borderRadius: 5,
                          borderColor: colors.text,
                          marginTop: 5,
                          width: '75%',
                          minWidth: 48,
                          minHeight: 48,
                        }}>
                        <TextInput
                          testID="send.amount"
                          placeholder={`#${decimalSeparator}########`}
                          placeholderTextColor={colors.placeholder}
                          keyboardType="numeric"
                          style={{
                            color: colors.text,
                            fontWeight: '600',
                            fontSize: 18,
                            minWidth: 48,
                            minHeight: 48,
                            marginLeft: 5,
                            backgroundColor: 'transparent',
                          }}
                          value={ta.amount.toString()}
                          onChangeText={(text: string) => updateToField(null, text.substring(0, 20), null, null, null)}
                          onEndEditing={(e: any) =>
                            updateToField(null, e.nativeEvent.text.substring(0, 20), null, null, null)
                          }
                          editable={true}
                          maxLength={20}
                        />
                      </View>
                    </View>

                    <View style={{ display: 'flex', flexDirection: 'column' }}>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          marginTop: 5,
                        }}>
                        <RegText style={{ fontSize: 14 }}>{translate('send.spendable') as string}</RegText>
                        <ZecAmount
                          currencyName={info.currencyName ? info.currencyName : ''}
                          color={stillConfirming ? 'red' : colors.money}
                          size={15}
                          amtZec={getMaxAmount()}
                          privacy={privacy}
                        />
                      </View>
                      {stillConfirming && (
                        <TouchableOpacity onPress={() => poolsMoreInfoOnClick()}>
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              marginTop: 5,
                              backgroundColor: colors.card,
                              padding: 5,
                              borderRadius: 10,
                            }}>
                            <FontAwesomeIcon
                              icon={faInfoCircle}
                              size={20}
                              color={colors.primary}
                              style={{ marginRight: 5 }}
                            />
                            <FadeText>{translate('send.somefunds') as string}</FadeText>
                          </View>
                        </TouchableOpacity>
                      )}
                      {(showShieldInfo || showUpgradeInfo) && (
                        <TouchableOpacity onPress={() => poolsMoreInfoOnClick()}>
                          <View
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              marginTop: 5,
                              backgroundColor: colors.card,
                              padding: 5,
                              borderRadius: 10,
                            }}>
                            <FontAwesomeIcon
                              icon={faInfoCircle}
                              size={20}
                              color={colors.primary}
                              style={{ marginRight: 5 }}
                            />
                            {showShieldInfo || mode === 'basic' ? (
                              <FadeText>{translate('send.needtoshield') as string}</FadeText>
                            ) : showUpgradeInfo ? (
                              <FadeText>{translate('send.needtoupgrade') as string}</FadeText>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {zecPrice.zecPrice <= 0 && (
                    <View
                      style={{
                        width: '35%',
                        marginTop: 5,
                      }}>
                      <PriceFetcher setZecPrice={setZecPrice} textBefore={translate('send.nofetchprice') as string} />
                    </View>
                  )}

                  {zecPrice.zecPrice > 0 && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        width: '35%',
                      }}>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'flex-start',
                        }}>
                        <RegText style={{ marginTop: 17, marginRight: 5 }}>$</RegText>
                        <View
                          accessible={true}
                          accessibilityLabel={translate('send.usd-acc') as string}
                          style={{
                            flexGrow: 1,
                            borderWidth: 1,
                            borderRadius: 5,
                            borderColor: colors.text,
                            marginTop: 5,
                            width: '55%',
                            minWidth: 48,
                            minHeight: 48,
                          }}>
                          <TextInput
                            placeholder={`#${decimalSeparator}##`}
                            placeholderTextColor={colors.placeholder}
                            keyboardType="numeric"
                            style={{
                              color: colors.text,
                              fontWeight: '600',
                              fontSize: 18,
                              minWidth: 48,
                              minHeight: 48,
                              marginLeft: 5,
                              backgroundColor: 'transparent',
                            }}
                            value={ta.amountCurrency.toString()}
                            onChangeText={(text: string) =>
                              updateToField(null, null, text.substring(0, 15), null, null)
                            }
                            onEndEditing={(e: any) =>
                              updateToField(null, null, e.nativeEvent.text.substring(0, 15), null, null)
                            }
                            editable={true}
                            maxLength={15}
                          />
                        </View>
                      </View>

                      <View style={{ flexDirection: 'column', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <RegText style={{ marginTop: 11, fontSize: 12.5 }}>
                            {translate('send.spendable') as string}
                          </RegText>
                          <CurrencyAmount
                            style={{ marginTop: 11, fontSize: 12.5 }}
                            price={zecPrice.zecPrice}
                            amtZec={getMaxAmount()}
                            currency={'USD'}
                            privacy={privacy}
                          />
                        </View>
                        <View style={{ marginLeft: 5 }}>
                          <PriceFetcher setZecPrice={setZecPrice} />
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {memoEnabled === true && (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                      <FadeText style={{ marginTop: 10 }}>{translate('send.memo') as string}</FadeText>
                      <View style={{ flexDirection: 'row' }}>
                        <FadeText style={{ marginTop: Platform.OS === 'ios' ? 5 : 3 }}>
                          {translate('send.includeua') as string}
                        </FadeText>
                        <CheckBox
                          testID="send.checkboxUA"
                          disabled={false}
                          value={ta.includeUAMemo}
                          onValueChange={(value: boolean) => updateToField(null, null, null, null, value)}
                          tintColors={{ true: colors.primary, false: colors.text }}
                          tintColor={colors.text}
                          onCheckColor={colors.card}
                          onFillColor={colors.primary}
                          onTintColor={colors.primary}
                          boxType="square"
                          style={{ transform: Platform.OS === 'ios' ? [{ scaleX: 0.7 }, { scaleY: 0.7 }] : [] }}
                        />
                      </View>
                    </View>
                    <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start' }}>
                      <View
                        accessible={true}
                        accessibilityLabel={translate('send.memo-acc') as string}
                        style={{
                          flexGrow: 1,
                          borderWidth: 1,
                          borderRadius: 5,
                          borderColor: colors.text,
                          minWidth: 48,
                          minHeight: 48,
                          maxHeight: 150,
                        }}>
                        <TextInput
                          testID="send.memo-field"
                          multiline
                          style={{
                            color: colors.text,
                            fontWeight: '600',
                            fontSize: 18,
                            minWidth: 48,
                            minHeight: 48,
                            marginLeft: 5,
                            backgroundColor: 'transparent',
                          }}
                          value={ta.memo}
                          onChangeText={(text: string) =>
                            updateToField(null, !ta.amount && !!text ? '0' : null, null, text, null)
                          }
                          editable={true}
                        />
                      </View>
                    </View>
                  </>
                )}
              </View>
            );
          })}
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginVertical: 5,
            }}>
            <Button
              testID="send.button"
              accessible={true}
              accessibilityLabel={'title ' + translate('send.button')}
              type="Primary"
              title={
                validAmount === 1 &&
                sendPageState.toaddr.amount &&
                Number(sendPageState.toaddr.amount) === Utils.parseLocaleFloat(getMaxAmount().toFixed(8))
                  ? (translate('send.button-all') as string)
                  : (translate('send.button') as string)
              }
              disabled={!sendButtonEnabled}
              onPress={() => {
                if (
                  validAmount === 1 &&
                  sendPageState.toaddr.amount &&
                  mode !== 'basic' &&
                  Number(sendPageState.toaddr.amount) === Utils.parseLocaleFloat(getMaxAmount().toFixed(8))
                ) {
                  addLastSnackbar({ message: `${translate('send.sendall-message') as string}`, type: 'Primary' });
                }
                if (!netInfo.isConnected) {
                  addLastSnackbar({ message: translate('loadedapp.connection-error') as string, type: 'Primary' });
                  return;
                }
                // waiting while closing the keyboard, just in case.
                setTimeout(async () => {
                  setConfirmModalVisible(true);
                }, 100);
              }}
            />
            <Button
              type="Secondary"
              style={{ marginLeft: 10 }}
              title={translate('send.clear') as string}
              onPress={() => clearToAddr()}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return returnPage;
};

export default Send;
