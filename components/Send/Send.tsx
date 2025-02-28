/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { View, ScrollView, Keyboard, TextInput, TouchableOpacity, Platform, Text, Alert } from 'react-native';
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
import { useTheme } from '@react-navigation/native';
import { getNumberFormatSettings } from 'react-native-localize';
import BouncyCheckbox from 'react-native-bouncy-checkbox';
import RNPickerSelect from 'react-native-picker-select';

import FadeText from '../Components/FadeText';
import ErrorText from '../Components/ErrorText';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import CurrencyAmount from '../Components/CurrencyAmount';
import Button from '../Components/Button';
import {
  AddressBookFileClass,
  CommandEnum,
  SendPageStateClass,
  ToAddrClass,
  ModeEnum,
  CurrencyEnum,
  ChainNameEnum,
  ButtonTypeEnum,
  GlobalConst,
  ServerUrisType,
  ServerType,
  SelectServerEnum,
  RouteEnums,
} from '../../app/AppState';
import { parseZcashURI, serverUris, ZcashURITargetClass } from '../../app/uris';
import RPCModule from '../../app/RPCModule';
import Utils from '../../app/utils';
import ScannerAddress from './components/ScannerAddress';
import Confirm from './components/Confirm';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import PriceFetcher from '../Components/PriceFetcher';
import RPC from '../../app/rpc';
import Header from '../Header';
import { createAlert } from '../../app/createAlert';
import AddressItem from '../Components/AddressItem';
import Memo from '../Memo';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { RPCSendProposeType } from '../../app/rpc/types/RPCSendProposeType';
import ShowAddressAlertAsync from './components/ShowAddressAlertAsync';
import { RPCSpendablebalanceType } from '../../app/rpc/types/RPCSpendablebalanceType';
import { RPCSendallProposeType } from '../../app/rpc/types/RPCSendallProposeType';
import { sendEmail } from '../../app/sendEmail';
import selectingServer from '../../app/selectingServer';
import { magicModal } from 'react-native-magic-modal';

type SendProps = {
  // side menu
  toggleMenuDrawer: () => void;
  // privacy
  setPrivacyOption: (value: boolean) => Promise<void>;
  // addLastSnackbar from context
  // shielding
  setShieldingAmount: (value: number) => void;
  setScrollToTop: (value: boolean) => void;
  setScrollToBottom: (value: boolean) => void;
  // for send
  sendTransaction: (s: SendPageStateClass) => Promise<String>;
  setServerOption: (
    value: ServerType,
    selectServer: SelectServerEnum,
    toast: boolean,
    sameServerChainName: boolean,
  ) => Promise<void>;
  clearToAddr: () => void;
};

const Send: React.FunctionComponent<SendProps> = ({
  sendTransaction,
  clearToAddr,
  toggleMenuDrawer,
  setPrivacyOption,
  setShieldingAmount,
  setScrollToTop,
  setScrollToBottom,
  setServerOption,
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
    somePending,
    addressBook,
    language,
    donation,
    addresses,
    uOrchardAddress,
    shieldingAmount,
    selectServer,
    setZecPrice,
    zenniesDonationAddress,
    setComputingModalShow,
    closeAllModals,
    setPoolsModalShow,
  } = context;
  const { colors } = useTheme() as ThemeType;
  moment.locale(language);

  const [memoEnabled, setMemoEnabled] = useState<boolean>(false);
  const [validAddress, setValidAddress] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [validAmount, setValidAmount] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - Invalid number, -2 - Invalid Amount
  const [validMemo, setValidMemo] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [sendButtonEnabled, setSendButtonEnabled] = useState<boolean>(false);
  const [itemsPicker, setItemsPicker] = useState<{ label: string; value: string }[]>([]);
  const [memoIcon, setMemoIcon] = useState<boolean>(false);
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [spendable, setSpendable] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);
  const [stillConfirming, setStillConfirming] = useState<boolean>(false);
  const [showShieldInfo, setShowShieldInfo] = useState<boolean>(false);
  const [updatingToField, setUpdatingToField] = useState<boolean>(false);
  const [donationAddress, setDonationAddress] = useState<boolean>(false);
  const [negativeMaxAmount, setNegativeMaxAmount] = useState<boolean>(false);
  //const [sendAllClick, setSendAllClick] = useState<boolean>(false);
  const [proposeSendLastError, setProposeSendLastError] = useState<string>('');
  const [spendableBalanceLastError, setSpendableBalanceLastError] = useState<string>('');
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [pickerTempSelectedAddress, setPickerTempSelectedAddress] = useState<string>('');
  const [addressText, setAddressText] = useState<string>(sendPageState.toaddr.to);
  const [memoText, setMemoText] = useState<string>(sendPageState.toaddr.memo);
  const [amountText, setAmountText] = useState<string>(sendPageState.toaddr.amount);
  const [amountCurrencyText, setAmountCurrencyText] = useState<string>(sendPageState.toaddr.amountCurrency);
  const [includeUAMemoBoolean, setIncludeUAMemoBoolean] = useState<boolean>(sendPageState.toaddr.includeUAMemo);
  const [keyboardListenersDone, setKeyboardListenersDone] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const { decimalSeparator } = getNumberFormatSettings();

  const runSendPropose = async (
    proposeJSON: string,
    command: CommandEnum.send | CommandEnum.sendall,
  ): Promise<string> => {
    try {
      const proposeStr: string = await RPCModule.execute(command, proposeJSON);
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

  const defaultValueFee = (): void => {
    setFee(0);
    setProposeSendLastError('');
  };

  const defaultValuesSpendableMaxAmount = useCallback((): void => {
    setSpendable(totalBalance ? totalBalance.spendableOrchard + totalBalance.spendablePrivate : 0);
    const max =
      (totalBalance ? totalBalance.spendableOrchard : 0) +
      (totalBalance ? totalBalance.spendablePrivate : 0) -
      (donation && server.chainName === ChainNameEnum.mainChainName && !donationAddress
        ? Utils.parseStringLocaleToNumberFloat(Utils.getZenniesDonationAmount())
        : 0);
    if (max >= 0) {
      // if max is 0 then the user can send a memo with amount 0.
      setMaxAmount(max);
      setNegativeMaxAmount(false);
    } else {
      // if max is less than 0 then the user CANNOT send anything.
      setMaxAmount(0);
      setNegativeMaxAmount(true);
    }
    setSpendableBalanceLastError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    donation,
    donationAddress,
    server.chainName,
    totalBalance,
    totalBalance?.spendableOrchard,
    totalBalance?.spendablePrivate,
  ]);

  const calculateFeeWithPropose = useCallback(
    async (
      amountPar: string,
      addressPar: string,
      memoPar: string,
      includeUAMemoPar: boolean,
      command: CommandEnum.send | CommandEnum.sendall,
    ): Promise<void> => {
      // if no address -> make no sense to run the propose
      if (!addressPar || validAddress !== 1) {
        defaultValueFee();
        return;
      }
      if (amountPar === '' || validAmount !== 1) {
        defaultValueFee();
        return;
      }
      if (validMemo === -1) {
        defaultValueFee();
        return;
      }

      let sendJson;

      if (command === CommandEnum.send) {
        const sendPageStateCalculateFee = new SendPageStateClass(new ToAddrClass(0));
        sendPageStateCalculateFee.toaddr.to = addressPar;
        sendPageStateCalculateFee.toaddr.memo = memoPar;
        sendPageStateCalculateFee.toaddr.includeUAMemo = includeUAMemoPar;
        sendPageStateCalculateFee.toaddr.amount = amountPar;

        sendJson = await Utils.getSendManyJSON(sendPageStateCalculateFee, uOrchardAddress, server, donation);
        console.log('SEND', sendJson);
      }

      let sendallJson;

      if (command === CommandEnum.sendall) {
        let zenniesForZingo = donationAddress ? false : donation;
        if (memoPar) {
          sendallJson = { address: addressPar, memo: memoPar, zennies_for_zingo: zenniesForZingo };
        } else {
          sendallJson = { address: addressPar, zennies_for_zingo: zenniesForZingo };
        }
        console.log('SENDALL', sendallJson);
      }

      // fee
      let proposeFee = 0;
      const runProposeStr = await runSendPropose(
        JSON.stringify(command === CommandEnum.send ? sendJson : sendallJson),
        command,
      );
      if (runProposeStr.toLowerCase().startsWith(GlobalConst.error)) {
        // snack with error
        console.log(runProposeStr);
        setProposeSendLastError(runProposeStr);
        //Alert.alert('Calculating the FEE', runProposeStr);
      } else {
        try {
          let runProposeJson: RPCSendProposeType & RPCSendallProposeType;
          if (command === CommandEnum.send) {
            runProposeJson = await JSON.parse(runProposeStr);
          } else {
            runProposeJson = await JSON.parse(runProposeStr);
          }
          if (runProposeJson.error) {
            // snack with error
            console.log(runProposeJson.error);
            setProposeSendLastError(runProposeJson.error);
            //Alert.alert('Calculating the FEE', runProposeJson.error);
          } else {
            if (runProposeJson.fee) {
              console.log('FEE', runProposeJson.fee);
              proposeFee = runProposeJson.fee / 10 ** 8;
              setProposeSendLastError('');
            }
            if (runProposeJson.amount) {
              const newAmount =
                runProposeJson.amount / 10 ** 8 -
                (donation && server.chainName === ChainNameEnum.mainChainName && !donationAddress
                  ? Utils.parseStringLocaleToNumberFloat(Utils.getZenniesDonationAmount())
                  : 0);
              console.log('AMOUNT', newAmount);
              updateToField(null, Utils.parseNumberFloatToStringLocale(newAmount, 8), null, null, null);
              setProposeSendLastError('');
            }
          }
        } catch (e) {
          // snack with error
          console.log(runProposeStr);
          setProposeSendLastError(runProposeStr);
          //Alert.alert('Calculating the FEE', runProposeJson.error);
        }
      }
      setFee(proposeFee);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addresses, donation, server, translate, uOrchardAddress, validAddress, validAmount, validMemo],
  );

  const calculateSpendableBalance = useCallback(
    async (addressPar: string): Promise<void> => {
      // if no address -> make no sense to run the propose
      if (!addressPar || validAddress !== 1) {
        defaultValuesSpendableMaxAmount();
        setSpendableBalanceLastError('');
        return;
      }
      // spendable
      let spendableBalance = totalBalance ? totalBalance.spendableOrchard + totalBalance.spendablePrivate : 0;
      let zenniesForZingo = donationAddress ? false : donation;
      const spendableBalanceJSON = { address: addressPar, zennies_for_zingo: zenniesForZingo };
      console.log('SPENDABLEBALANCE', spendableBalanceJSON);
      const runSpendableBalanceStr = await RPCModule.execute(
        CommandEnum.spendablebalance,
        JSON.stringify(spendableBalanceJSON),
      );
      console.log(runSpendableBalanceStr);
      if (runSpendableBalanceStr.toLowerCase().startsWith(GlobalConst.error)) {
        // snack with error
        console.log(runSpendableBalanceStr);
        setSpendableBalanceLastError(runSpendableBalanceStr);
        //Alert.alert('Calculating the FEE', runProposeStr);
      } else {
        try {
          const runSpendableBalanceJson: RPCSpendablebalanceType = await JSON.parse(runSpendableBalanceStr);
          if (runSpendableBalanceJson.error) {
            // snack with error
            console.log(runSpendableBalanceJson.error);
            setSpendableBalanceLastError(runSpendableBalanceJson.error);
            //Alert.alert('Calculating the FEE', runProposeJson.error);
          } else if (runSpendableBalanceJson.balance) {
            console.log('BALANCE', runSpendableBalanceJson.balance);
            spendableBalance = runSpendableBalanceJson.balance / 10 ** 8;
            setSpendableBalanceLastError('');
          }
        } catch (e) {
          // snack with error
          console.log(runSpendableBalanceStr);
          setSpendableBalanceLastError(runSpendableBalanceStr);
          //Alert.alert('Calculating the FEE', runProposeJson.error);
        }
      }
      setSpendable(spendableBalance);
      // max amount
      // don't need to substract the donation here.
      const max = spendableBalance;
      if (max >= 0) {
        // if max is 0 then the user can send a memo with amount 0.
        setMaxAmount(max);
        setNegativeMaxAmount(false);
        //if (sendAllClick) {
        //  updateToField(null, Utils.parseNumberFloatToStringLocale(max, 8), null, null, null);
        //}
      } else {
        // if max is less than 0 then the user CANNOT send anything.
        setMaxAmount(0);
        setNegativeMaxAmount(true);
        //if (sendAllClick) {
        //  updateToField(null, '0', null, null, null);
        //}
      }
      //setSendAllClick(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      defaultValuesSpendableMaxAmount,
      donation,
      donationAddress,
      totalBalance,
      totalBalance?.spendableOrchard,
      totalBalance?.spendablePrivate,
      validAddress,
    ],
  );

  const updateToField = async (
    addressPar: string | null,
    amountPar: string | null,
    amountCurrencyPar: string | null,
    memoPar: string | null,
    includeUAMemoPar: boolean | null,
  ) => {
    if (addressPar !== null) {
      setAddressText(addressPar);
      // Attempt to parse as URI if it starts with zcash
      if (addressPar.toLowerCase().startsWith(GlobalConst.zcash)) {
        const target: string | ZcashURITargetClass = await parseZcashURI(addressPar, translate, server);

        if (typeof target !== 'string') {
          // redo the to addresses
          [target].forEach(tgt => {
            setAddressText(tgt.address || '');
            setAmountText(Utils.parseNumberFloatToStringLocale(tgt.amount || 0, 8));
            setMemoText(tgt.memoString || '');
          });
        } else {
          // Show the error message as a toast
          addLastSnackbar({ message: target });
        }
      } else {
        setAddressText(addressPar.replace(/[ \t\n\r]+/g, '')); // Remove spaces
      }
    }

    if (amountPar !== null) {
      //console.log('update field', amount);
      const amountTemp = amountPar.substring(0, 20);
      if (isNaN(Utils.parseStringLocaleToNumberFloat(amountTemp))) {
        setAmountCurrencyText('');
      } else if (amountTemp && zecPrice && zecPrice.zecPrice > 0) {
        setAmountCurrencyText(
          Utils.parseNumberFloatToStringLocale(Utils.parseStringLocaleToNumberFloat(amountTemp) * zecPrice.zecPrice, 2),
        );
      } else {
        setAmountCurrencyText('');
      }
      setAmountText(amountTemp);
    }

    if (amountCurrencyPar !== null) {
      //console.log('update field', amountCurrency);
      const amountCurrencyTemp = amountCurrencyPar.substring(0, 15);
      if (isNaN(Utils.parseStringLocaleToNumberFloat(amountCurrencyTemp))) {
        setAmountText('');
      } else if (amountCurrencyTemp && zecPrice && zecPrice.zecPrice > 0) {
        setAmountText(
          Utils.parseNumberFloatToStringLocale(
            Utils.parseStringLocaleToNumberFloat(amountCurrencyTemp) / zecPrice.zecPrice,
            8,
          ),
        );
      } else {
        setAmountText('');
      }
      setAmountCurrencyText(amountCurrencyTemp);
    }

    if (memoPar !== null) {
      setMemoText(memoPar);
    }

    if (includeUAMemoPar !== null) {
      setIncludeUAMemoBoolean(includeUAMemoPar);
    }
  };

  useEffect(() => {
    const stillConf =
      (totalBalance ? totalBalance.orchardBal : 0) !== (totalBalance ? totalBalance.spendableOrchard : 0) ||
      (totalBalance ? totalBalance.privateBal : 0) !== (totalBalance ? totalBalance.spendablePrivate : 0) ||
      somePending;
    const showShield = (somePending ? 0 : shieldingAmount) > 0;
    //const showUpgrade =
    //  (somePending ? 0 : totalBalance.transparentBal) === 0 && totalBalance.spendablePrivate > fee;
    setStillConfirming(stillConf);
    setShowShieldInfo(showShield);
  }, [
    shieldingAmount,
    somePending,
    totalBalance,
    totalBalance?.orchardBal,
    totalBalance?.privateBal,
    totalBalance?.spendableOrchard,
    totalBalance?.spendablePrivate,
  ]);

  useEffect(() => {
    calculateFeeWithPropose(amountText, addressText, memoText, includeUAMemoBoolean, CommandEnum.send);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    calculateFeeWithPropose,
    amountText,
    amountCurrencyText,
    includeUAMemoBoolean,
    // don't have to recalculate the fee if the memo change.
    // memoText,
    addressText,
  ]);

  useEffect(() => {
    calculateSpendableBalance(addressText);
  }, [calculateSpendableBalance, addressText]);

  useEffect(() => {
    const getMemoEnabled = async (address: string, serverChainName: string): Promise<boolean> => {
      return await Utils.isValidOrchardOrSaplingAddress(address, serverChainName);
    };

    if (addressText) {
      getMemoEnabled(addressText, server.chainName).then(r => {
        setMemoEnabled(r);
        if (!r) {
          setMemoText('');
        }
      });
    } else {
      setMemoEnabled(false);
      setMemoText('');
    }
  }, [server.chainName, addressText]);

  useEffect(() => {
    const parseAddress = async (
      address: string,
      serverChainName: string,
    ): Promise<{ isValid: boolean; onlyOrchardUA: string }> => {
      return await Utils.isValidAddress(address, serverChainName);
    };

    if (addressText) {
      parseAddress(addressText, server.chainName).then(r => {
        setValidAddress(r.isValid ? 1 : -1);
        if (!r.isValid) {
          setSpendableBalanceLastError('');
        }
      });
    } else {
      setValidAddress(0);
    }

    if (memoText || includeUAMemoBoolean) {
      const len = Utils.countMemoBytes(memoText, includeUAMemoBoolean, uOrchardAddress);
      if (len > GlobalConst.memoMaxLength) {
        setValidMemo(-1);
      } else {
        setValidMemo(1);
      }
    } else {
      setValidMemo(0);
    }

    let invalid = false;
    if (amountCurrencyText !== '') {
      if (isNaN(Utils.parseStringLocaleToNumberFloat(amountCurrencyText))) {
        setValidAmount(-1); // invalid number
        invalid = true;
      }
    }
    if (!invalid) {
      if (amountText !== '') {
        if (isNaN(Utils.parseStringLocaleToNumberFloat(amountText))) {
          setValidAmount(-1); // invalid number
        } else {
          if (
            Utils.parseStringLocaleToNumberFloat(amountText) >= 0 &&
            Utils.parseStringLocaleToNumberFloat(amountText) <=
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
    donationAddress,
    decimalSeparator,
    server.chainName,
    addressText,
    amountCurrencyText,
    amountText,
    memoText,
    includeUAMemoBoolean,
    spendable,
    fee,
    maxAmount,
    uOrchardAddress,
  ]);

  useEffect(() => {
    setSendButtonEnabled(
      // send amount 0 with transparent address make no sense.
      // you always will get `dust` error.
      validAddress === 1 &&
        validAmount === 1 &&
        validMemo !== -1 &&
        fee > 0 &&
        !(!memoEnabled && Utils.parseStringLocaleToNumberFloat(amountText) === 0),
    );
  }, [memoEnabled, amountText, validAddress, validAmount, validMemo, fee]);

  useEffect(() => {
    (async () => {
      if (mode === ModeEnum.basic) {
        const price = await RPC.rpcGetZecPrice();
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
    (async () => {
      const items = addressBook
        .filter((item: AddressBookFileClass) => item.address !== zenniesDonationAddress)
        .map((item: AddressBookFileClass) => ({
          label: item.label,
          value: item.address,
        }));
      setItemsPicker(items);
    })();
  }, [addressBook, zenniesDonationAddress]);

  useEffect(() => {
    if (addressText) {
      (async () => {
        const donationA =
          addressText === (await Utils.getDonationAddress(server.chainName)) ||
          addressText === zenniesDonationAddress ||
          addressText === (await Utils.getNymDonationAddress(server.chainName));
        setDonationAddress(donationA);
      })();
    } else {
      setDonationAddress(false);
    }
  }, [addresses, addressText, server.chainName, zenniesDonationAddress]);

  useEffect(() => {
    setAddressText(sendPageState.toaddr.to);
    setAmountText(sendPageState.toaddr.amount);
    setAmountCurrencyText(sendPageState.toaddr.amountCurrency);
    setMemoText(sendPageState.toaddr.memo);
    setIncludeUAMemoBoolean(sendPageState.toaddr.includeUAMemo);
  }, [
    sendPageState.toaddr.amount,
    sendPageState.toaddr.amountCurrency,
    sendPageState.toaddr.includeUAMemo,
    sendPageState.toaddr.memo,
    sendPageState.toaddr.to,
  ]);

  const keyboardListeners = (titleViewHeightPar: number) => {
    if (titleViewHeightPar > 0 && !keyboardListenersDone) {
      //only the first time if the height is more than 0.
      setKeyboardListenersDone(true);
      Keyboard.addListener('keyboardDidShow', () => {
        setKeyboardVisible(true);
        //console.log('OPENNNNNNNNNN', titleViewHeightPar, slideAnim.value);
      });
      Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardVisible(false);
        //console.log('CLOSEEEEEEEEE', titleViewHeightPar, slideAnim.value);
      });
    }
  };

  const buildSendState = () => {
    return {
      toaddr: {
        to: addressText,
        amount: amountText,
        amountCurrency: amountCurrencyText,
        memo: memoText,
        includeUAMemo: includeUAMemoBoolean,
      },
    } as SendPageStateClass;
  };

  const clearState = () => {
    setAddressText('');
    setAmountText('');
    setAmountCurrencyText('');
    setMemoText('');
    setIncludeUAMemoBoolean(false);
    clearToAddr();
  };

  const confirmSend = async (sendPageStatePar: SendPageStateClass) => {
    if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
      return;
    }
    // first interrupt syncing Just in case...
    await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.true);

    // not use await here.
    setComputingModalShow();

    // call the sendTransaction method in a timeout, allowing the modals to show properly
    setTimeout(async () => {
      let error = '';
      let customError: string | undefined;
      try {
        const txid = await sendTransaction(sendPageStatePar);

        // Clear the fields
        clearState();

        navigation.navigate(RouteEnums.LoadedApp, {
          screen: translate('loadedapp.history-menu') as string,
          initial: false,
        });

        // scroll to top in history, just in case.
        setScrollToTop(true);
        setScrollToBottom(true);

        createAlert(
          setBackgroundError,
          addLastSnackbar,
          translate('send.confirm-title') as string,
          `${translate('send.Broadcast')} ${txid}`,
          true,
          translate,
        );
        closeAllModals();
        // the app send successfully on the first attemp.

        // the sync process can continue
        await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false);
        return;
      } catch (err1) {
        error = err1 as string;

        customError = interceptCustomError(error);

        // in this point the App is failing, there is two possibilities:
        // 1. Server Error
        // 2. Another type of Error
        // here is worth it to try again with the best working server...
        // if the user selected a `custom` server, then we cannot change it.
        if (!customError && selectServer !== SelectServerEnum.custom) {
          // try send again with a working server
          const serverChecked = await selectingServer(serverUris(translate).filter((s: ServerUrisType) => !s.obsolete));
          let fasterServer: ServerType = {} as ServerType;
          if (serverChecked && serverChecked.latency) {
            fasterServer = { uri: serverChecked.uri, chainName: serverChecked.chainName };
          } else {
            fasterServer = server;
            // likely here there is a internet conection problem
            // all of the servers return an error because they are unreachable probably.
            // the 30 seconds timout was fired.
          }
          console.log(serverChecked);
          console.log(fasterServer);
          if (fasterServer.uri !== server.uri) {
            setServerOption(fasterServer, selectServer, false, true);
            // first interrupt syncing Just in case...
            await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.true);
          }

          try {
            const txid = await sendTransaction(sendPageStatePar);

            // Clear the fields
            clearState();

            navigation.navigate(RouteEnums.LoadedApp, {
              screen: translate('loadedapp.history-menu') as string,
              initial: false,
            });

            // scroll to top in history, just in case.
            setScrollToTop(true);
            setScrollToBottom(true);

            createAlert(
              setBackgroundError,
              addLastSnackbar,
              translate('send.confirm-title') as string,
              `${translate('send.Broadcast')} ${txid}`,
              true,
              translate,
            );
            closeAllModals();
            // the app send successfully on the second attemp.

            // the sync process can continue
            await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false);
            return;
          } catch (err2) {
            error = err2 as string;

            customError = interceptCustomError(error);
          }
        }
      }

      // the sync process can continue
      await RPC.rpcSetInterruptSyncAfterBatch(GlobalConst.false);

      setTimeout(() => {
        //console.log('sendtx error', error);
        // if the App is in background I need to store the error
        // and when the App come back to foreground shows it to the user.
        createAlert(
          setBackgroundError,
          addLastSnackbar,
          translate('send.sending-error') as string,
          `${customError ? customError : error}`,
          false,
          translate,
          sendEmail,
          info.zingolib,
        );
      }, 1000);
      closeAllModals();
    });
  };

  const interceptCustomError = (error: string) => {
    // these error are not server related.
    if (
      error.includes('18: bad-txns-sapling-duplicate-nullifier') ||
      error.includes('18: bad-txns-sprout-duplicate-nullifier') ||
      error.includes('18: bad-txns-orchard-duplicate-nullifier')
    ) {
      // bad-txns-xxxxxxxxx-duplicate-nullifier (3 errors)
      return translate('send.duplicate-nullifier-error') as string;
    } else if (error.includes('64: dust')) {
      // dust
      return translate('send.dust-error') as string;
    }
  };

  const scrollToEnd = () => {
    if (scrollViewRef.current) {
      //console.log('scrolling to end', keyboardVisible);
      scrollViewRef.current.scrollTo({ y: contentHeight, animated: true });
    }
  };

  const setQrcodeModalShow = () => {
    return magicModal.show(() => <ScannerAddress setAddress={(a: string) => {
          updateToField(a, null, null, null, null);
        }}
      />, { swipeDirection: undefined }
    ).promise;
  };

  const setMemoModalShow = () => {
    return magicModal.show(() => <Memo
        message={memoText}
        includeUAMessage={includeUAMemoBoolean}
        setMessage={setMemoText}
      />, { swipeDirection: undefined }
    ).promise;
  };

  const setConfirmModalShow = () => {
    return magicModal.show(() => <Confirm
        calculatedFee={fee}
        donationAmount={
          donation && server.chainName === ChainNameEnum.mainChainName && !donationAddress
            ? Utils.parseStringLocaleToNumberFloat(Utils.getZenniesDonationAmount())
            : 0
        }
        confirmSend={confirmSend}
        sendAllAmount={
          mode !== ModeEnum.basic &&
          Utils.parseStringLocaleToNumberFloat(amountText) ===
            Utils.parseStringLocaleToNumberFloat(maxAmount.toFixed(8))
        }
        calculateFeeWithPropose={calculateFeeWithPropose}
        sendPageState={buildSendState()}
      />, { swipeDirection: undefined }
    ).promise;
  };

  //console.log(
  //  'Render, spendable',
  //  spendable,
  //  'maxAmount',
  //  maxAmount,
  //  'Fee',
  //  fee,
  //  keyboardVisible,
  //  contentHeight,
  //);

  //console.log(slideAnim.value);

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

      <View
        onLayout={e => {
          const { height } = e.nativeEvent.layout;
          keyboardListeners(height);
          //console.log('LAYOUTTT', height);
        }}>
        <Header
          title={translate('send.title') as string}
          toggleMenuDrawer={toggleMenuDrawer}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar /* context */}
          setShieldingAmount={setShieldingAmount}
          setScrollToTop={setScrollToTop}
          setScrollToBottom={setScrollToBottom}
          setBackgroundError={setBackgroundError /* context */}
        />
      </View>
      <ScrollView
        ref={scrollViewRef}
        onContentSizeChange={(_, height) => setContentHeight(height)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{}}
        testID="send.scroll-view">
        <View style={{ marginBottom: Platform.OS === GlobalConst.platformOSandroid ? 30 : 250 }}>
          <View style={{ display: 'flex', padding: 10, paddingTop: 5, marginTop: 0 }}>
            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ display: 'flex', flexDirection: 'row' }}>
                <RegText style={{ marginRight: 10 }}>{translate('send.toaddress') as string}</RegText>
                {validAddress === 1 && (
                  <AddressItem
                    address={addressText}
                    oneLine={true}
                    onlyContact={true}
                    withIcon={true}
                  />
                )}
              </View>
              {validAddress === 1 && (
                <View testID="send.address.check">
                  <FontAwesomeIcon icon={faCheck} color={colors.primary} />
                </View>
              )}
              {validAddress === -1 && (
                <ErrorText testID="send.address.error">{translate('send.invalidaddress') as string}</ErrorText>
              )}
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
                    value={addressText}
                    onChangeText={(text: string) => {
                      updateToField(text, null, null, null, null);
                    }}
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
                  {addressText && (
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
                          value={
                            pickerTempSelectedAddress && Platform.OS === GlobalConst.platformOSios
                              ? pickerTempSelectedAddress
                              : addressText
                          }
                          items={itemsPicker}
                          placeholder={{
                            label: translate('addressbook.select-placeholder') as string,
                            value: addressText,
                            color: colors.primary,
                          }}
                          useNativeAndroidPickerStyle={false}
                          onDonePress={async () => {
                            // only for IOS
                            if (
                              validAddress === 1 &&
                              addressText &&
                              pickerTempSelectedAddress &&
                              addressText !== pickerTempSelectedAddress
                            ) {
                              setUpdatingToField(true);
                              await ShowAddressAlertAsync(translate)
                                .then(() => {
                                  updateToField(pickerTempSelectedAddress, null, null, null, null);
                                })
                                .catch(() => {
                                  updateToField(addressText, null, null, null, null);
                                });
                              setTimeout(() => {
                                setUpdatingToField(false);
                              }, 500);
                            } else if (addressText !== pickerTempSelectedAddress) {
                              updateToField(pickerTempSelectedAddress, null, null, null, null);
                            }
                            setPickerTempSelectedAddress('');
                          }}
                          onValueChange={async (itemValue: string) => {
                            // only for Android
                            if (Platform.OS === GlobalConst.platformOSandroid) {
                              if (validAddress === 1 && addressText && itemValue && addressText !== itemValue) {
                                setUpdatingToField(true);
                                await ShowAddressAlertAsync(translate)
                                  .then(() => {
                                    updateToField(itemValue, null, null, null, null);
                                  })
                                  .catch(() => {
                                    updateToField(addressText, null, null, null, null);
                                  });
                                setTimeout(() => {
                                  setUpdatingToField(false);
                                }, 500);
                              } else if (addressText !== itemValue) {
                                updateToField(itemValue, null, null, null, null);
                              }
                            } else {
                              setPickerTempSelectedAddress(itemValue);
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
                      setQrcodeModalShow();
                    }}>
                    <FontAwesomeIcon style={{ marginRight: 5 }} size={35} icon={faQrcode} color={colors.border} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    borderRadius: 10,
                    margin: 0,
                    padding: 0,
                    paddingBottom: 3,
                  }}>
                  <FadeText>{`${translate('send.amount')}`}</FadeText>
                </View>
                {sendAll && mode !== ModeEnum.basic && (
                  <TouchableOpacity
                    onPress={() => {
                      //if (fee > 0) {
                      updateToField(null, Utils.parseNumberFloatToStringLocale(maxAmount, 8), null, null, null);
                      //}
                      calculateFeeWithPropose(
                        Utils.parseNumberFloatToStringLocale(maxAmount, 8),
                        addressText,
                        memoText,
                        includeUAMemoBoolean,
                        CommandEnum.sendall,
                      );
                      //setSendAllClick(true);
                      //setTimeout(() => {
                      //  setSendAllClick(false);
                      //}, 1000);
                    }}>
                    <View
                      style={{
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        borderRadius: 10,
                        margin: 0,
                        padding: 0,
                        marginLeft: 10,
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
                      value={amountText}
                      onChangeText={(text: string) => updateToField(null, text.substring(0, 20), null, null, null)}
                      onEndEditing={(e: any) => {
                        updateToField(null, e.nativeEvent.text.substring(0, 20), null, null, null);
                        calculateFeeWithPropose(
                          e.nativeEvent.text.substring(0, 20),
                          addressText,
                          memoText,
                          includeUAMemoBoolean,
                          CommandEnum.send,
                        );
                      }}
                      editable={true}
                      maxLength={20}
                    />
                  </View>
                </View>

                <View style={{ display: 'flex', flexDirection: 'column' }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (spendableBalanceLastError && mode === ModeEnum.advanced) {
                        Alert.alert(
                          translate('send.spendable') as string,
                          spendableBalanceLastError,
                          [
                            {
                              text: translate('support') as string,
                              onPress: async () =>
                                sendEmail(
                                  translate,
                                  info.zingolib,
                                  translate('send.spendable') as string,
                                  spendableBalanceLastError,
                                ),
                            },
                            { text: translate('cancel') as string, style: 'cancel' },
                          ],
                          { cancelable: false },
                        );
                      }
                    }}>
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        marginTop: 0,
                      }}>
                      <RegText
                        style={{
                          fontSize: 14,
                          color: spendableBalanceLastError && mode === ModeEnum.advanced ? 'red' : colors.money,
                        }}>
                        {translate('send.spendable') as string}
                      </RegText>
                      <ZecAmount
                        currencyName={info.currencyName}
                        color={
                          stillConfirming ||
                          negativeMaxAmount ||
                          (spendableBalanceLastError && mode === ModeEnum.advanced)
                            ? 'red'
                            : colors.money
                        }
                        size={15}
                        amtZec={maxAmount}
                        privacy={privacy}
                      />
                    </View>
                  </TouchableOpacity>
                  {donation && server.chainName === ChainNameEnum.mainChainName && !donationAddress && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        marginTop: 0,
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
                      <FadeText>
                        {(translate('send.confirm-donation') as string) + ': ' + Utils.getZenniesDonationAmount() + ' '}
                      </FadeText>
                      <FadeText>{')'}</FadeText>
                    </View>
                  )}
                  {validAddress !== 0 && validAmount !== 0 && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        marginTop: 0,
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
                      <TouchableOpacity
                        onPress={() => {
                          if (proposeSendLastError && mode === ModeEnum.advanced) {
                            Alert.alert(
                              translate('send.fee') as string,
                              proposeSendLastError,
                              [
                                {
                                  text: translate('support') as string,
                                  onPress: async () =>
                                    sendEmail(
                                      translate,
                                      info.zingolib,
                                      translate('send.fee') as string,
                                      proposeSendLastError,
                                    ),
                                },
                                { text: translate('cancel') as string, style: 'cancel' },
                              ],
                              { cancelable: false },
                            );
                          }
                        }}>
                        <FadeText
                          style={{
                            color: proposeSendLastError && mode === ModeEnum.advanced ? 'red' : colors.money,
                          }}>
                          {(translate('send.fee') as string) +
                            ': ' +
                            Utils.parseNumberFloatToStringLocale(fee, 8) +
                            ' '}
                        </FadeText>
                      </TouchableOpacity>
                      <FadeText>{')'}</FadeText>
                    </View>
                  )}
                  {stillConfirming && (
                    <TouchableOpacity onPress={() => setPoolsModalShow()}>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          marginTop: 0,
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
                        <FadeText style={{ fontSize: 12.5 }}>{translate('send.somefunds') as string}</FadeText>
                      </View>
                    </TouchableOpacity>
                  )}
                  {showShieldInfo && mode === ModeEnum.advanced && (
                    <TouchableOpacity onPress={() => setPoolsModalShow()}>
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          marginTop: 0,
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
                        <FadeText>{translate('send.needtoshield') as string}</FadeText>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {(!zecPrice.zecPrice || zecPrice.zecPrice <= 0) && (
                <View
                  style={{
                    width: '35%',
                    marginTop: 5,
                  }}>
                  <PriceFetcher setZecPrice={setZecPrice} textBefore={translate('send.nofetchprice') as string} />
                </View>
              )}

              {!!zecPrice.zecPrice && zecPrice.zecPrice > 0 && (
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
                        value={amountCurrencyText}
                        onChangeText={(text: string) => updateToField(null, null, text.substring(0, 15), null, null)}
                        onEndEditing={(e: any) => {
                          updateToField(null, null, e.nativeEvent.text.substring(0, 15), null, null);
                          // re-calculate the fee with the zec amount in the other field
                          calculateFeeWithPropose(
                            amountText,
                            addressText,
                            memoText,
                            includeUAMemoBoolean,
                            CommandEnum.send,
                          );
                        }}
                        editable={true}
                        maxLength={15}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'column', justifyContent: 'flex-start' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
                      <RegText style={{ marginTop: 5, fontSize: 12.5 }}>
                        {translate('send.spendable') as string}
                      </RegText>
                      <CurrencyAmount
                        style={{ marginTop: 5, fontSize: 12.5 }}
                        price={zecPrice.zecPrice}
                        amtZec={maxAmount}
                        currency={CurrencyEnum.USDCurrency}
                        privacy={privacy}
                      />
                    </View>
                    <View style={{ marginLeft: 5, flexDirection: 'row', justifyContent: 'flex-start' }}>
                      <View style={{ width: '40%' }} />
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
                  <FadeText style={{ marginTop: 6, marginBottom: 5 }}>{translate('send.memo') as string}</FadeText>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <FadeText style={{ marginTop: 6, marginBottom: 5, marginRight: 5 }}>{translate('send.includeua') as string}</FadeText>
                    <BouncyCheckbox
                      testID="send.checkboxua"
                      disabled={false}
                      disableText
                      isChecked={includeUAMemoBoolean}
                      useBuiltInState={false}
                      onPress={() => updateToField(null, null, null, null, !includeUAMemoBoolean)}
                      unFillColor={colors.card}
                      fillColor={colors.primary}
                      innerIconStyle={{
                        borderRadius: 5,
                      }}
                      iconStyle={{
                        borderRadius: 5,
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
                      maxHeight: 130,
                    }}>
                    <TextInput
                      testID="send.memo-field"
                      placeholder={translate('messages.message-placeholder') as string}
                      placeholderTextColor={colors.placeholder}
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
                      value={memoText}
                      onChangeText={(text: string) => {
                        updateToField(null, !amountText && !!text ? '0' : null, null, text, null);
                      }}
                      onEndEditing={(e: any) => {
                        updateToField(
                          null,
                          !amountText && !!e.nativeEvent.text ? '0' : null,
                          null,
                          e.nativeEvent.text,
                          null,
                        );
                        calculateFeeWithPropose(
                          amountText,
                          addressText,
                          e.nativeEvent.text,
                          includeUAMemoBoolean,
                          CommandEnum.send,
                        );
                      }}
                      onContentSizeChange={(e: any) => {
                        if (
                          e.nativeEvent.contentSize.height >
                            (Platform.OS === GlobalConst.platformOSandroid ? 70 : 35) &&
                          !memoIcon
                        ) {
                          setMemoIcon(true);
                          scrollToEnd();
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
                      onFocus={() => {
                        // I need to wait for the keyboard is totally open
                        // otherwise the scroll to end never happened.
                        if (keyboardVisible) {
                          scrollToEnd();
                        } else {
                          setTimeout(() => {
                            scrollToEnd();
                          }, 1000);
                        }
                      }}
                    />
                    {memoText && (
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
                          setMemoModalShow();
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
                {validMemo === -1 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                    }}>
                    <FadeText
                      style={{
                        marginTop: 0,
                        fontWeight: 'bold',
                        fontSize: 12.5,
                        color: 'red',
                      }}>{`${Utils.countMemoBytes(memoText, includeUAMemoBoolean, uOrchardAddress)} `}</FadeText>
                    <FadeText style={{ marginTop: 0, fontSize: 12.5 }}>{translate('loadedapp.of') as string}</FadeText>
                    <FadeText style={{ marginTop: 0, fontSize: 12.5 }}>
                      {' ' + GlobalConst.memoMaxLength.toString() + ' '}
                    </FadeText>
                  </View>
                )}
              </>
            )}
          </View>
          <View
            style={{
              flexGrow: 1,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              marginVertical: 0,
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
                testID={sendButtonEnabled ? 'send.button' : 'send.button-disabled'}
                accessible={true}
                accessibilityLabel={'title ' + translate('send.button')}
                type={ButtonTypeEnum.Primary}
                title={
                  validAmount === 1 &&
                  amountText &&
                  mode !== ModeEnum.basic &&
                  Utils.parseStringLocaleToNumberFloat(amountText) ===
                    Utils.parseStringLocaleToNumberFloat(maxAmount.toFixed(8))
                    ? (translate('send.button-all') as string)
                    : (translate('send.button') as string)
                }
                disabled={!sendButtonEnabled}
                onPress={() => {
                  updateToField(null, null, null, memoText, null);
                  // donation - a Zenny is the minimum
                  if (
                    server.chainName === ChainNameEnum.mainChainName &&
                    donationAddress &&
                    Utils.parseStringLocaleToNumberFloat(amountText) <
                      Utils.parseStringLocaleToNumberFloat(Utils.getZenniesDonationAmount())
                  ) {
                    addLastSnackbar({ message: `${translate('send.donation-minimum-message') as string}` });
                    updateToField(null, Utils.getZenniesDonationAmount(), null, null, false);
                    return;
                  }
                  if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
                    addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
                    return;
                  }
                  if (
                    validAmount === 1 &&
                    amountText &&
                    mode !== ModeEnum.basic &&
                    Utils.parseStringLocaleToNumberFloat(amountText) ===
                      Utils.parseStringLocaleToNumberFloat(maxAmount.toFixed(8))
                  ) {
                    addLastSnackbar({ message: `${translate('send.sendall-message') as string}` });
                  }
                  // if the address is transparent - clean the memo field Just in Case.
                  if (!memoEnabled) {
                    setMemoText('');
                    updateToField(null, null, null, '', false);
                  }
                  // waiting while closing the keyboard, just in case.
                  setTimeout(async () => {
                    setConfirmModalShow();
                  }, 100);
                }}
                twoButtons={true}
              />
              <Button
                type={ButtonTypeEnum.Secondary}
                style={{ marginLeft: 10 }}
                title={translate('send.clear') as string}
                onPress={() => {
                  defaultValueFee();
                  defaultValuesSpendableMaxAmount();
                  clearState();
                  setPickerTempSelectedAddress('');
                }}
                twoButtons={true}
              />
            </View>
            {server.chainName === ChainNameEnum.mainChainName && (
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
                      if (addressText && addressText !== (await Utils.getDonationAddress(server.chainName))) {
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
                          await Utils.getDonationAddress(server.chainName),
                          Utils.getDonationAmount(),
                          null,
                          Utils.getDonationMemo(translate),
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
