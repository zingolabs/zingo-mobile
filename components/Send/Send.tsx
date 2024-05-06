/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, ScrollView, Modal, Keyboard, TextInput, TouchableOpacity, Platform, Text, Alert } from 'react-native';
import {
  faQrcode,
  faCheck,
  faInfoCircle,
  faAddressCard,
  faMagnifyingGlassPlus,
  faMoneyCheckDollar,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useTheme, useIsFocused } from '@react-navigation/native';
import { getNumberFormatSettings } from 'react-native-localize';
import Animated, { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import CheckBox from '@react-native-community/checkbox';
import RNPickerSelect from 'react-native-picker-select';

import FadeText from '../Components/FadeText';
import ErrorText from '../Components/ErrorText';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import CurrencyAmount from '../Components/CurrencyAmount';
import Button from '../Components/Button';
import {
  AddressBookFileClass,
  AddressClass,
  CommandEnum,
  SendPageStateClass,
  SendProgressClass,
  ToAddrClass,
  ModeEnum,
  CurrencyEnum,
  ChainNameEnum,
  SettingsNameEnum,
  ButtonTypeEnum,
  GlobalConst,
} from '../../app/AppState';
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
import Memo from '../Memo';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { RPCProposeType } from '../../app/rpc/types/RPCProposeType';
import { RPCParseStatusEnum } from '../../app/rpc/enums/RPCParseStatusEnum';
import { RPCAdressKindEnum } from '../../app/rpc/enums/RPCAddressKindEnum';
import { Buffer } from 'buffer';
import ShowAddressAlertAsync from './components/ShowAddressAlertAsync';

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
  set_privacy_option: (name: SettingsNameEnum.privacy, value: boolean) => Promise<void>;
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
    language,
    donation,
    addresses,
    uaAddress,
  } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [qrcodeModalVisble, setQrcodeModalVisible] = useState<boolean>(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState<boolean>(false);
  const [titleViewHeight, setTitleViewHeight] = useState<number>(0);
  const [memoEnabled, setMemoEnabled] = useState<boolean>(false);
  const [validAddress, setValidAddress] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [validAmount, setValidAmount] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - Invalid number, -2 - Invalid Amount
  const [validMemo, setValidMemo] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [sendButtonEnabled, setSendButtonEnabled] = useState<boolean>(false);
  const [itemsPicker, setItemsPicker] = useState<{ label: string; value: string }[]>([]);
  const [memoIcon, setMemoIcon] = useState<boolean>(false);
  const [memoModalVisible, setMemoModalVisible] = useState<boolean>(false);
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [spendable, setSpendable] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);
  const [stillConfirming, setStillConfirming] = useState<boolean>(false);
  const [showShieldInfo, setShowShieldInfo] = useState<boolean>(false);
  const [showUpgradeInfo, setShowUpgradeInfo] = useState<boolean>(false);
  const [updatingToField, setUpdatingToField] = useState<boolean>(false);
  const [sendToSelf, setSendToSelf] = useState<boolean>(false);
  const [donationAddress, setDonationAddress] = useState<boolean>(false);
  const [negativeMaxAount, setNegativeMaxAount] = useState<boolean>(false);
  const [sendAllClick, setSendAllClick] = useState<boolean>(false);
  const [proposeSendLastError, setProposeSendLastError] = useState<string>('');
  const isFocused = useIsFocused();

  const slideAnim = useSharedValue(0);
  const { decimalSeparator } = getNumberFormatSettings();

  const runSendPropose = async (proposeJSON: string): Promise<string> => {
    try {
      const proposeStr: string = await RPCModule.execute(CommandEnum.propose_send, proposeJSON);
      if (proposeStr) {
        if (proposeStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error propose ${proposeStr}`);
          return proposeStr;
        }
      } else {
        console.log('Internal Error propose');
        return 'Error: Internal RPC Error: propose';
      }

      return proposeStr;
    } catch (error) {
      console.log(`Critical Error propose ${error}`);
      return `Error: ${error}`;
    }
  };

  const calculateFeeWithPropose = async (
    amount: string,
    address: string,
    memo: string,
    includeUAMemo: boolean,
  ): Promise<void> => {
    console.log(address, validAddress);
    console.log(amount, validAmount);
    console.log(validMemo);
    // if no address -> make no sense to run the propose
    if (!address || validAddress !== 1) {
      return;
    }
    if (amount === '' || validAmount !== 1) {
      return;
    }
    if (validMemo === -1) {
      return;
    }
    const sendPageStateCalculateFee = new SendPageStateClass(new ToAddrClass(0));
    sendPageStateCalculateFee.toaddr.to = address;
    sendPageStateCalculateFee.toaddr.memo = memo;
    sendPageStateCalculateFee.toaddr.includeUAMemo = includeUAMemo;

    sendPageStateCalculateFee.toaddr.amount =
      validAmount === 1 ? amount : validAmount === -2 ? Utils.parseNumberFloatToStringLocale(maxAmount, 8) : '0';

    let proposeFee = 0;
    const sendJson = await Utils.getSendManyJSON(
      sendPageStateCalculateFee,
      uaAddress,
      addresses,
      server,
      donation,
      translate,
    );
    const runProposeStr = await runSendPropose(JSON.stringify(sendJson));
    console.log(sendJson);
    if (runProposeStr.toLowerCase().startsWith(GlobalConst.error)) {
      // snack with error
      console.log(runProposeStr);
      setProposeSendLastError(runProposeStr);
      //Alert.alert('Calculating the FEE', runProposeStr);
    } else {
      try {
        const runProposeJson: RPCProposeType = JSON.parse(runProposeStr);
        if (runProposeJson.error) {
          // snack with error
          console.log(runProposeJson.error);
          setProposeSendLastError(runProposeStr);
          //Alert.alert('Calculating the FEE', runProposeJson.error);
        } else if (runProposeJson.fee) {
          console.log(runProposeJson.fee);
          proposeFee = runProposeJson.fee / 10 ** 8;
          setProposeSendLastError('');
        }
      } catch (e) {
        // snack with error
        console.log(runProposeStr);
        setProposeSendLastError(runProposeStr);
        //Alert.alert('Calculating the FEE', runProposeJson.error);
      }
    }
    setFee(proposeFee);
  };

  const memoTotal = useCallback((memoPar: string, includeUAMemoPar: boolean, uaAddressPar: string) => {
    return `${memoPar || ''}${includeUAMemoPar ? '\nReply to: \n' + uaAddressPar : ''}`;
  }, []);

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
      if (address.toLowerCase().startsWith(GlobalConst.zcash)) {
        const target: string | ZcashURITargetClass = await parseZcashURI(address, translate, server);
        //console.log(target);

        if (typeof target !== 'string') {
          // redo the to addresses
          [target].forEach(tgt => {
            toAddr.to = tgt.address || '';
            toAddr.amount = Utils.parseNumberFloatToStringLocale(tgt.amount || 0, 8);
            toAddr.memo = tgt.memoString || '';
          });
        } else {
          // Show the error message as a toast
          addLastSnackbar({ message: target });
          //return;
        }
      } else {
        toAddr.to = address.replace(/[ \t\n\r]+/g, ''); // Remove spaces
      }
    }

    if (amount !== null) {
      //console.log('update field', amount);
      toAddr.amount = amount.substring(0, 20);
      if (isNaN(Utils.parseStringLocaleToNumberFloat(toAddr.amount))) {
        toAddr.amountCurrency = '';
      } else if (toAddr.amount && zecPrice && zecPrice.zecPrice > 0) {
        toAddr.amountCurrency = Utils.parseNumberFloatToStringLocale(
          Utils.parseStringLocaleToNumberFloat(toAddr.amount) * zecPrice.zecPrice,
          2,
        );
      } else {
        toAddr.amountCurrency = '';
      }
      //console.log('update field 2', toAddr.amount, toAddr.amountCurrency);
    }

    if (amountCurrency !== null) {
      //console.log('update field', amountCurrency);
      toAddr.amountCurrency = amountCurrency.substring(0, 15);
      if (isNaN(Utils.parseStringLocaleToNumberFloat(toAddr.amountCurrency))) {
        toAddr.amount = '';
      } else if (toAddr.amountCurrency && zecPrice && zecPrice.zecPrice > 0) {
        toAddr.amount = Utils.parseNumberFloatToStringLocale(
          Utils.parseStringLocaleToNumberFloat(toAddr.amountCurrency) / zecPrice.zecPrice,
          8,
        );
      } else {
        toAddr.amount = '';
      }
      //console.log('update field 2', toAddr.amount, toAddr.amountCurrency);
    }

    if (memo !== null) {
      toAddr.memo = memo;
    }

    if (includeUAMemo !== null) {
      toAddr.includeUAMemo = includeUAMemo;
    }

    newState.toaddr = newToAddr;
    setSendPageState(newState);
    //console.log(newState);
  };

  useEffect(() => {
    if (validAddress === 0 && validAmount === 0) {
      setFee(0);
    } else if (validAddress !== -1 && validAmount !== -1) {
      calculateFeeWithPropose(
        sendPageState.toaddr.amount,
        sendPageState.toaddr.to,
        sendPageState.toaddr.memo,
        sendPageState.toaddr.includeUAMemo,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sendPageState.toaddr.amount,
    sendPageState.toaddr.includeUAMemo,
    //sendPageState.toaddr.memo,
    sendPageState.toaddr.to,
    validAddress,
    validAmount,
  ]);

  useEffect(() => {
    // transparent is not spendable.
    const spend = totalBalance.spendablePrivate + totalBalance.spendableOrchard;
    const max = spend - fee - (donation ? Utils.parseStringLocaleToNumberFloat(Utils.getDefaultDonationAmount()) : 0);
    if (max >= 0) {
      // if max is 0 then the user can send a memo with amount 0.
      setMaxAmount(max);
      setNegativeMaxAount(false);
      if (sendAllClick) {
        updateToField(null, Utils.parseNumberFloatToStringLocale(max, 8), null, null, null);
      }
    } else {
      // if max is less than 0 then the user CANNOT send anything.
      setMaxAmount(0);
      setNegativeMaxAount(true);
      if (sendAllClick) {
        updateToField(null, '0', null, null, null);
      }
    }
    setSpendable(spend);
    setSendAllClick(false);

    const stillConf =
      totalBalance.orchardBal !== totalBalance.spendableOrchard ||
      totalBalance.privateBal !== totalBalance.spendablePrivate ||
      someUnconfirmed;
    const showShield =
      (someUnconfirmed ? 0 : totalBalance.transparentBal) > 0 &&
      (someUnconfirmed ? 0 : totalBalance.transparentBal) + totalBalance.spendablePrivate > fee;
    const showUpgrade =
      (someUnconfirmed ? 0 : totalBalance.transparentBal) === 0 && totalBalance.spendablePrivate > fee;
    setStillConfirming(stillConf);
    setShowShieldInfo(showShield);
    setShowUpgradeInfo(showUpgrade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    donation,
    fee,
    someUnconfirmed,
    totalBalance.orchardBal,
    totalBalance.privateBal,
    totalBalance.spendableOrchard,
    totalBalance.spendablePrivate,
    totalBalance.transparentBal,
  ]);

  useEffect(() => {
    const getMemoEnabled = async (address: string): Promise<boolean> => {
      if (!netInfo.isConnected) {
        addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
        return false;
      }
      const result: string = await RPCModule.execute(CommandEnum.parse_address, address);
      //console.log(result);
      if (result) {
        if (result.toLowerCase().startsWith(GlobalConst.error) || result.toLowerCase() === 'null') {
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
        resultJSON.status === RPCParseStatusEnum.successParse &&
        resultJSON.address_kind !== RPCAdressKindEnum.transparentAddressKind &&
        resultJSON.chain_name === server.chain_name
      );
    };

    const address = sendPageState.toaddr.to;

    if (address) {
      getMemoEnabled(address).then(r => {
        setMemoEnabled(r);
        if (!r) {
          updateToField(null, null, null, '', false);
        }
      });
    } else {
      setMemoEnabled(false);
      updateToField(null, null, null, '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server.chain_name, netInfo.isConnected, sendPageState.toaddr.to, translate, addLastSnackbar]);

  useEffect(() => {
    const parseAdressJSON = async (address: string): Promise<boolean> => {
      if (!netInfo.isConnected) {
        addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
        return false;
      }
      const result: string = await RPCModule.execute(CommandEnum.parse_address, address);
      //console.log(result);
      if (result) {
        if (result.toLowerCase().startsWith(GlobalConst.error) || result.toLowerCase() === 'null') {
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

      //console.log('parse-address', address, resultJSON, resultJSON.status === RPCParseStatusEnum.successParse);

      return resultJSON.status === RPCParseStatusEnum.successParse && resultJSON.chain_name === server.chain_name;
    };

    var to = sendPageState.toaddr;

    if (to.to) {
      parseAdressJSON(to.to).then(r => {
        setValidAddress(r ? 1 : -1);
      });
    } else {
      setValidAddress(0);
    }

    if (to.memo || to.includeUAMemo) {
      const len = Buffer.byteLength(memoTotal(to.memo, to.includeUAMemo, uaAddress), 'utf8');
      if (len > GlobalConst.memoMaxLength) {
        setValidMemo(-1);
      } else {
        setValidMemo(1);
      }
    } else {
      setValidMemo(0);
    }

    let invalid = false;
    if (to.amountCurrency !== '') {
      if (isNaN(Utils.parseStringLocaleToNumberFloat(to.amountCurrency))) {
        setValidAmount(-1); // invalid number
        invalid = true;
      }
    }
    if (!invalid) {
      if (to.amount !== '') {
        if (isNaN(Utils.parseStringLocaleToNumberFloat(to.amount))) {
          setValidAmount(-1); // invalid number
        } else {
          if (
            Utils.parseStringLocaleToNumberFloat(spendable.toFixed(8)) >=
              Utils.parseStringLocaleToNumberFloat(fee.toFixed(8)) +
                (donation ? Utils.parseStringLocaleToNumberFloat(Utils.getDefaultDonationAmount()) : 0) &&
            Utils.parseStringLocaleToNumberFloat(to.amount) >= 0 &&
            Utils.parseStringLocaleToNumberFloat(to.amount) <=
              Utils.parseStringLocaleToNumberFloat(maxAmount.toFixed(8))
          ) {
            setValidAmount(1); // valid
          } else {
            setValidAmount(-2); // invalid amount
          }
        }
      } else {
        setValidAmount(0); // empty
      }
    }
  }, [
    donation,
    decimalSeparator,
    server.chain_name,
    netInfo.isConnected,
    sendPageState.toaddr,
    sendPageState.toaddr.to,
    sendPageState.toaddr.amountCurrency,
    sendPageState.toaddr.amount,
    sendPageState.toaddr.memo,
    sendPageState.toaddr.includeUAMemo,
    translate,
    addLastSnackbar,
    spendable,
    fee,
    maxAmount,
    uaAddress,
    memoTotal,
  ]);

  useEffect(() => {
    setSendButtonEnabled(
      // send amount 0 with transparent address make no sense.
      // you always will get `dust` error.
      validAddress === 1 &&
        validAmount === 1 &&
        validMemo !== -1 &&
        fee > 0 &&
        !(!memoEnabled && Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) === 0),
    );
  }, [memoEnabled, sendPageState.toaddr.amount, validAddress, validAmount, validMemo, fee]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      slideAnim.value = withTiming(0 - titleViewHeight + 25, { duration: 100, easing: Easing.linear });
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      slideAnim.value = withTiming(0, { duration: 100, easing: Easing.linear });
    });

    return () => {
      !!keyboardDidShowListener && keyboardDidShowListener.remove();
      !!keyboardDidHideListener && keyboardDidHideListener.remove();
    };
  }, [slideAnim, titleViewHeight]);

  useEffect(() => {
    (async () => {
      if (mode === ModeEnum.basic) {
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

  useEffect(() => {
    (async () => {
      if (isFocused) {
        await RPC.rpc_setInterruptSyncAfterBatch(GlobalConst.true);
      } else {
        await RPC.rpc_setInterruptSyncAfterBatch(GlobalConst.false);
      }
    })();
  }, [isFocused]);

  useEffect(() => {
    const address = sendPageState.toaddr.to;
    if (address) {
      (async () => {
        const myAddress: AddressClass[] = addresses.filter((a: AddressClass) => a.address === address);
        const sendToS = myAddress.length >= 1;

        const donationA = address === (await Utils.getDonationAddress(server.chain_name));
        setSendToSelf(sendToS);
        setDonationAddress(donationA);
      })();
    } else {
      setSendToSelf(false);
      setDonationAddress(false);
    }
  }, [addresses, sendPageState.toaddr.to, server.chain_name]);

  const confirmSend = async () => {
    if (!netInfo.isConnected) {
      setConfirmModalVisible(false);
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
      return;
    }
    // first interrupt syncing Just in case...
    await RPC.rpc_setInterruptSyncAfterBatch(GlobalConst.true);
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

  const countMemoBytes = (memo: string, includeUAMemo: boolean) => {
    const len = Buffer.byteLength(memoTotal(memo, includeUAMemo, uaAddress), 'utf8');
    return len;
  };

  //console.log('render Send - 4', sendPageState);

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
          calculatedFee={fee}
          donationAmount={
            donation && server.chain_name === ChainNameEnum.mainChainName && !sendToSelf && !donationAddress
              ? Utils.parseStringLocaleToNumberFloat(Utils.getDefaultDonationAmount())
              : 0
          }
          closeModal={() => {
            setConfirmModalVisible(false);
          }}
          openModal={() => {
            setConfirmModalVisible(true);
          }}
          confirmSend={confirmSend}
          sendAllAmount={
            mode !== ModeEnum.basic &&
            Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) ===
              Utils.parseStringLocaleToNumberFloat(maxAmount.toFixed(8))
          }
          calculateFeeWithPropose={calculateFeeWithPropose}
        />
      </Modal>

      <Modal
        animationType="slide"
        transparent={false}
        visible={memoModalVisible}
        onRequestClose={() => setMemoModalVisible(false)}>
        <Memo
          closeModal={() => {
            setMemoModalVisible(false);
          }}
          updateToField={updateToField}
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

      {validAddress === 1 && !memoEnabled && (
        <FadeText
          style={{ textAlign: 'center', marginHorizontal: 10, marginTop: 5, color: colors.zingo, opacity: 1, fontWeight: '700' }}>
          {translate('warning-binance') as string}
        </FadeText>
      )}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{}} testID="send.scroll-view">
        <View style={{ marginBottom: 30 }}>
          {[sendPageState.toaddr].map((ta, i) => {
            return (
              <View key={i} style={{ display: 'flex', padding: 10, marginTop: 10 }}>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ display: 'flex', flexDirection: 'row' }}>
                    <RegText style={{ marginRight: 10 }}>{translate('send.toaddress') as string}</RegText>
                    {validAddress === 1 && (
                      <AddressItem
                        address={ta.to}
                        oneLine={true}
                        onlyContact={true}
                        withIcon={true}
                        closeModal={() => {}}
                        openModal={() => {}}
                      />
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
                          fontSize: 14,
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
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      {ta.to && (
                        <TouchableOpacity
                          onPress={() => {
                            updateToField('', null, null, null, null);
                          }}>
                          <FontAwesomeIcon
                            style={{ marginRight: 5 }}
                            size={25}
                            icon={faXmark}
                            color={colors.primaryDisabled}
                          />
                        </TouchableOpacity>
                      )}
                      {itemsPicker.length > 0 && (
                        <>
                          {!updatingToField ? (
                            <RNPickerSelect
                              fixAndroidTouchableBug={true}
                              value={ta.to}
                              items={itemsPicker}
                              placeholder={{
                                label: translate('addressbook.select-placeholder') as string,
                                value: ta.to,
                                color: colors.primary,
                              }}
                              useNativeAndroidPickerStyle={false}
                              onValueChange={async (itemValue: string) => {
                                if (validAddress === 1 && ta.to && itemValue && ta.to !== itemValue) {
                                  setUpdatingToField(true);
                                  await ShowAddressAlertAsync(translate)
                                    .then(() => {
                                      updateToField(itemValue, null, null, null, null);
                                    })
                                    .catch(() => {
                                      updateToField(ta.to, null, null, null, null);
                                    });
                                  setTimeout(() => {
                                    setUpdatingToField(false);
                                  }, 500);
                                } else if (ta.to !== itemValue) {
                                  updateToField(itemValue, null, null, null, null);
                                }
                              }}>
                              <FontAwesomeIcon
                                style={{ marginRight: 7 }}
                                size={39}
                                icon={faAddressCard}
                                color={colors.primary}
                              />
                            </RNPickerSelect>
                          ) : (
                            <FontAwesomeIcon
                              style={{ marginRight: 7 }}
                              size={39}
                              icon={faAddressCard}
                              color={colors.primaryDisabled}
                            />
                          )}
                        </>
                      )}
                      <TouchableOpacity
                        testID="send.scan-button"
                        accessible={true}
                        accessibilityLabel={translate('send.scan-acc') as string}
                        onPress={() => {
                          setQrcodeModalVisible(true);
                        }}>
                        <FontAwesomeIcon style={{ marginRight: 5 }} size={35} icon={faQrcode} color={colors.border} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
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
                    {sendAll && mode !== ModeEnum.basic && (
                      <TouchableOpacity
                        onPress={() => {
                          if (fee > 0) {
                            updateToField(null, Utils.parseNumberFloatToStringLocale(maxAmount, 8), null, null, null);
                          }
                          calculateFeeWithPropose(
                            Utils.parseNumberFloatToStringLocale(maxAmount, 8),
                            sendPageState.toaddr.to,
                            sendPageState.toaddr.memo,
                            sendPageState.toaddr.includeUAMemo,
                          );
                          setSendAllClick(true);
                          setTimeout(() => {
                            setSendAllClick(false);
                          }, 1000);
                        }}>
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
                  {validAmount === -1 && <ErrorText>{translate('send.invalidnumber') as string}</ErrorText>}
                  {validAmount === -2 && <ErrorText>{translate('send.invalidamount') as string}</ErrorText>}
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
                      <RegText style={{ marginTop: 18, marginRight: 5, fontSize: 20, transform: [{ scaleY: 1.5 }] }}>
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
                            fontSize: 16,
                            minWidth: 48,
                            minHeight: 48,
                            marginLeft: 5,
                            backgroundColor: 'transparent',
                          }}
                          value={ta.amount}
                          onChangeText={(text: string) => updateToField(null, text.substring(0, 20), null, null, null)}
                          onEndEditing={(e: any) => {
                            updateToField(null, e.nativeEvent.text.substring(0, 20), null, null, null);
                            calculateFeeWithPropose(
                              e.nativeEvent.text.substring(0, 20),
                              ta.to,
                              ta.memo,
                              ta.includeUAMemo,
                            );
                          }}
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
                          currencyName={info.currencyName}
                          color={stillConfirming || negativeMaxAount ? 'red' : colors.money}
                          size={15}
                          amtZec={maxAmount}
                          privacy={privacy}
                        />
                      </View>
                      {(donation || (validAddress !== 0 && validAmount !== 0)) && (
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
                          <FadeText>{'( '}</FadeText>
                          {donation && !sendToSelf && !donationAddress && (
                            <FadeText>
                              {(translate('send.confirm-donation') as string) +
                                ': ' +
                                Utils.getDefaultDonationAmount() +
                                ' '}
                            </FadeText>
                          )}
                          {validAddress !== 0 && validAmount !== 0 && (
                            <TouchableOpacity
                              onPress={() => {
                                if (proposeSendLastError) {
                                  Alert.alert(translate('send.fee') as string, proposeSendLastError);
                                }
                              }}>
                              <FadeText style={{ color: fee > 0 ? colors.text : 'red' }}>
                                {(translate('send.fee') as string) +
                                  ': ' +
                                  Utils.parseNumberFloatToStringLocale(fee, 8) +
                                  ' '}
                              </FadeText>
                            </TouchableOpacity>
                          )}
                          <FadeText>{')'}</FadeText>
                        </View>
                      )}
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
                            {showShieldInfo || mode === ModeEnum.basic ? (
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
                              fontSize: 16,
                              minWidth: 48,
                              minHeight: 48,
                              marginLeft: 5,
                              backgroundColor: 'transparent',
                            }}
                            value={ta.amountCurrency}
                            onChangeText={(text: string) =>
                              updateToField(null, null, text.substring(0, 15), null, null)
                            }
                            onEndEditing={(e: any) => {
                              updateToField(null, null, e.nativeEvent.text.substring(0, 15), null, null);
                              // re-calculate the fee with the zec amount in the other field
                              calculateFeeWithPropose(ta.amount, ta.to, ta.memo, ta.includeUAMemo);
                            }}
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
                            amtZec={maxAmount}
                            currency={CurrencyEnum.USDCurrency}
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
                      <FadeText style={{ marginTop: 10, marginBottom: 15 }}>
                        {translate('send.memo') as string}
                      </FadeText>
                      <View style={{ flexDirection: 'row' }}>
                        <FadeText style={{ marginTop: 6 }}>{translate('send.includeua') as string}</FadeText>
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
                          style={{
                            transform:
                              Platform.OS === GlobalConst.platformOSios ? [{ scaleX: 0.7 }, { scaleY: 0.7 }] : [],
                          }}
                        />
                      </View>
                    </View>
                    <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start' }}>
                      <View
                        accessible={true}
                        accessibilityLabel={translate('send.memo-acc') as string}
                        style={{
                          flexGrow: 1,
                          flexDirection: 'row',
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
                            flex: 1,
                            color: colors.text,
                            fontWeight: '600',
                            fontSize: 14,
                            minWidth: 48,
                            minHeight: 48,
                            marginLeft: 5,
                            backgroundColor: 'transparent',
                            textAlignVertical: 'top',
                          }}
                          value={ta.memo}
                          onChangeText={(text: string) =>
                            updateToField(null, !ta.amount && !!text ? '0' : null, null, text, null)
                          }
                          onEndEditing={(e: any) => {
                            updateToField(
                              null,
                              !ta.amount && !!e.nativeEvent.text ? '0' : null,
                              null,
                              e.nativeEvent.text,
                              null,
                            );
                            calculateFeeWithPropose(ta.amount, ta.to, e.nativeEvent.text, ta.includeUAMemo);
                          }}
                          editable={true}
                          onContentSizeChange={(e: any) => {
                            if (
                              e.nativeEvent.contentSize.height >
                                (Platform.OS === GlobalConst.platformOSandroid ? 70 : 35) &&
                              !memoIcon
                            ) {
                              setMemoIcon(true);
                            }
                            if (
                              e.nativeEvent.contentSize.height <=
                                (Platform.OS === GlobalConst.platformOSandroid ? 70 : 35) &&
                              memoIcon
                            ) {
                              setMemoIcon(false);
                            }
                          }}
                          maxLength={GlobalConst.memoMaxLength}
                        />
                        {ta.memo && (
                          <TouchableOpacity
                            onPress={() => {
                              updateToField(null, null, null, '', null);
                            }}>
                            <FontAwesomeIcon
                              style={{ marginTop: 7, marginRight: memoIcon ? 0 : 7 }}
                              size={25}
                              icon={faXmark}
                              color={colors.primaryDisabled}
                            />
                          </TouchableOpacity>
                        )}
                        {memoIcon && (
                          <TouchableOpacity
                            onPress={() => {
                              setMemoModalVisible(true);
                            }}>
                            <FontAwesomeIcon
                              style={{ margin: 7 }}
                              size={30}
                              icon={faMagnifyingGlassPlus}
                              color={colors.border}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                      }}>
                      <FadeText
                        style={{
                          marginTop: 5,
                          fontWeight: 'bold',
                          color: validMemo === -1 ? 'red' : colors.text,
                        }}>{`${countMemoBytes(ta.memo, ta.includeUAMemo)} `}</FadeText>
                      <FadeText style={{ marginTop: 5 }}>{translate('loadedapp.of') as string}</FadeText>
                      <FadeText style={{ marginTop: 5 }}>{' ' + GlobalConst.memoMaxLength.toString() + ' '}</FadeText>
                    </View>
                  </>
                )}
              </View>
            );
          })}
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              marginVertical: 5,
            }}>
            <View
              style={{
                flexGrow: 1,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
              }}>
              <Button
                testID="send.button"
                accessible={true}
                accessibilityLabel={'title ' + translate('send.button')}
                type={ButtonTypeEnum.Primary}
                title={
                  validAmount === 1 &&
                  sendPageState.toaddr.amount &&
                  mode !== ModeEnum.basic &&
                  Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) ===
                    Utils.parseStringLocaleToNumberFloat(maxAmount.toFixed(8))
                    ? (translate('send.button-all') as string)
                    : (translate('send.button') as string)
                }
                disabled={!sendButtonEnabled}
                onPress={() => {
                  // donation - a Zenny is the minimum
                  if (
                    donationAddress &&
                    Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) <
                      Utils.parseStringLocaleToNumberFloat(Utils.getDefaultDonationAmount())
                  ) {
                    addLastSnackbar({ message: `${translate('send.donation-minimum-message') as string}` });
                    updateToField(null, Utils.getDefaultDonationAmount(), null, null, false);
                    return;
                  }
                  if (
                    validAmount === 1 &&
                    sendPageState.toaddr.amount &&
                    mode !== ModeEnum.basic &&
                    Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) ===
                      Utils.parseStringLocaleToNumberFloat(maxAmount.toFixed(8))
                  ) {
                    addLastSnackbar({ message: `${translate('send.sendall-message') as string}` });
                  }
                  if (!netInfo.isConnected) {
                    addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
                    return;
                  }
                  // if the address is transparent - clean the memo field Just in Case.
                  if (!memoEnabled) {
                    updateToField(null, null, null, '', false);
                  }
                  // waiting while closing the keyboard, just in case.
                  setTimeout(async () => {
                    setConfirmModalVisible(true);
                  }, 100);
                }}
              />
              <Button
                type={ButtonTypeEnum.Secondary}
                style={{ marginLeft: 10 }}
                title={translate('send.clear') as string}
                onPress={() => {
                  setFee(0);
                  clearToAddr();
                }}
              />
            </View>
            {server.chain_name === ChainNameEnum.mainChainName && (
              <>
                {donation ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingHorizontal: 4,
                      paddingBottom: 2,
                      borderWidth: 1,
                      borderColor: colors.primary,
                      borderRadius: 5,
                    }}>
                    <Text style={{ fontSize: 13, color: colors.border }}>{translate('donation-legend') as string}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={async () => {
                      let update = false;
                      if (
                        sendPageState.toaddr.to &&
                        sendPageState.toaddr.to !== (await Utils.getDonationAddress(server.chain_name))
                      ) {
                        await ShowAddressAlertAsync(translate)
                          .then(async () => {
                            // fill the fields in the screen with the donation data
                            update = true;
                          })
                          .catch(() => {});
                      } else {
                        // fill the fields in the screen with the donation data
                        update = true;
                      }
                      if (update) {
                        updateToField(
                          await Utils.getDonationAddress(server.chain_name),
                          Utils.getDefaultDonationAmount(),
                          null,
                          Utils.getDefaultDonationMemo(translate),
                          true,
                        );
                      }
                    }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 4,
                        paddingBottom: 2,
                        borderWidth: 1,
                        borderColor: colors.primary,
                        borderRadius: 5,
                      }}>
                      <Text style={{ fontSize: 13, color: colors.border }}>
                        {translate('donation-button') as string}
                      </Text>
                      <FontAwesomeIcon
                        style={{ marginTop: 3 }}
                        size={20}
                        icon={faMoneyCheckDollar}
                        color={colors.primary}
                      />
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return returnPage;
};

export default Send;
