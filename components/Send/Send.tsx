/* eslint-disable react-native/no-inline-styles */
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  ScrollView,
  Keyboard,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  NativeSyntheticEvent,
  TextInputEndEditingEventData,
  KeyboardAvoidingView,
} from 'react-native';
import {
  faQrcode,
  faCheck,
  faInfoCircle,
  faChevronLeft,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation, useTheme } from '@react-navigation/native';
import { getNumberFormatSettings } from 'react-native-localize';

import FadeText from '../Components/FadeText';
import ErrorText from '../Components/ErrorText';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import Button from '../Components/Button';
import {
  SendPageStateClass,
  ToAddrClass,
  ModeEnum,
  ChainNameEnum,
  ButtonTypeEnum,
  GlobalConst,
  ServerUrisType,
  ServerType,
  SelectServerEnum,
  RouteEnum,
  SecurityType,
  ScreenEnum,
} from '../../app/AppState';
import { parseZcashURI, serverUris } from '../../app/uris';
import RPCModule from '../../app/RPCModule';
import Utils from '../../app/utils';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { createAlert } from '../../app/createAlert';
import { RPCSendProposeType } from '../../app/rpc/types/RPCSendProposeType';
import { sendEmail } from '../../app/sendEmail';
import selectingServer from '../../app/selectingServer';
import { RPCParseAddressType } from '../../app/rpc/types/RPCParseAddressType';
import { RPCSpendablebalanceType } from '../../app/rpc/types/RPCSpendablebalanceType';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../Components/Snackbars';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SendProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Send> & {
  // side menu
  toggleMenuDrawer: () => void;
  // privacy
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
  setSecurityOption: (s: SecurityType) => Promise<void>;
};

const Send: React.FunctionComponent<SendProps> = ({
  sendTransaction,
  clearToAddr,
  setScrollToTop,
  setScrollToBottom,
  setServerOption,
  //setSecurityOption,
}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    info,
    totalBalance,
    sendPageState,
    zecPrice,
    netInfo,
    privacy,
    indexerServer,
    setBackgroundError,
    addLastSnackbar,
    mode,
    somePending,
    donation,
    addresses,
    defaultUnifiedAddress,
    shieldingAmount,
    selectIndexerServer,
    zenniesDonationAddress,
    zingolibVersion,
    snackbars,
    removeFirstSnackbar,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Send;

  const [memoEnabled, setMemoEnabled] = useState<boolean>(false);
  const [validAddress, setValidAddress] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [validAmount, setValidAmount] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - Invalid number, -2 - Invalid Amount
  const [validMemo, setValidMemo] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [sendButtonEnabled, setSendButtonEnabled] = useState<boolean>(false);
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [spendable, setSpendable] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);
  const [stillConfirming, setStillConfirming] = useState<boolean>(false);
  const [donationAddress, setDonationAddress] = useState<boolean>(false);
  const [negativeMaxAmount, setNegativeMaxAmount] = useState<boolean>(false);
  //const [sendAllClick, setSendAllClick] = useState<boolean>(false);
  const [proposeSendLastError, setProposeSendLastError] = useState<string>('');
  const [spendableBalanceLastError, setSpendableBalanceLastError] = useState<string>('');
  const [addressText, setAddressText] = useState<string>(sendPageState.toaddr.to);
  const [memoText, setMemoText] = useState<string>(sendPageState.toaddr.memo);
  const [amountText, setAmountText] = useState<string>(sendPageState.toaddr.amount);
  const [amountCurrencyText, setAmountCurrencyText] = useState<string>(sendPageState.toaddr.amountCurrency);
  const [includeUAMemoBoolean, setIncludeUAMemoBoolean] = useState<boolean>(sendPageState.toaddr.includeUAMemo);
  const [kbOpen, setKbOpen] = React.useState(false);
  
  const { decimalSeparator } = getNumberFormatSettings();

  const insets = useSafeAreaInsets();
  
  const maxW = 520; //tablets -> landscape. 
  
  const runSendPropose = async (
    proposeJSON: string,
  ): Promise<string> => {
    try {
      const proposeStr: string = await RPCModule.sendProcess(proposeJSON);
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
    setSpendable(totalBalance ? totalBalance.totalSpendableBalance : 0);
    const max =
      (totalBalance ? totalBalance.totalSpendableBalance : 0) -
      (donation && indexerServer.chainName === ChainNameEnum.mainChainName && !donationAddress
        ? Utils.parseStringLocaleToNumberFloat(Utils.getZenniesDonationAmount())
        : 0);
    if (max > 0) {
      // if max have to be more than 0, then the user can send a memo with amount 0 & some fee.
      setMaxAmount(max);
      setNegativeMaxAmount(false);
    } else {
      // if max is 0 or less than 0 then the user CANNOT send anything  because of the fee
      setMaxAmount(0);
      setNegativeMaxAmount(true);
    }
    setSpendableBalanceLastError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    donation,
    donationAddress,
    indexerServer.chainName,
    totalBalance,
    totalBalance?.totalSpendableBalance,
  ]);

  const calculateFeeWithPropose = useCallback(
    async (
      amountPar: string,
      addressPar: string,
      memoPar: string,
      includeUAMemoPar: boolean,
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

      const sendPageStateCalculateFee = new SendPageStateClass(new ToAddrClass(0));
      sendPageStateCalculateFee.toaddr.to = addressPar;
      sendPageStateCalculateFee.toaddr.memo = memoPar;
      sendPageStateCalculateFee.toaddr.includeUAMemo = includeUAMemoPar;
      sendPageStateCalculateFee.toaddr.amount = amountPar;

      sendJson = await Utils.getSendManyJSON(sendPageStateCalculateFee, defaultUnifiedAddress, indexerServer, donation);
      console.log('SEND', sendJson);

      // fee
      let proposeFee = 0;
      const runProposeStr = await runSendPropose(
        JSON.stringify(sendJson),
      );
      //Alert.alert('Calculating the FEE ' + command, runProposeStr);
      if (runProposeStr && runProposeStr.toLowerCase().startsWith(GlobalConst.error)) {
        // snack with error
        console.log(runProposeStr);
        setProposeSendLastError(runProposeStr);
        //Alert.alert('Calculating the FEE', runProposeStr);
      } else {
        try {
          let runProposeJson: RPCSendProposeType;
          runProposeJson = await JSON.parse(runProposeStr);
          if (runProposeJson.error) {
            // snack with error
            console.log('SEND error', runProposeJson.error);
            setProposeSendLastError(runProposeJson.error);
            //Alert.alert('Calculating the FEE', runProposeJson.error);
          } else {
            if (runProposeJson.fee !== undefined) {
              console.log('FEE', runProposeJson.fee);
              proposeFee = runProposeJson.fee / 10 ** 8;
              setProposeSendLastError('');
            }
            if (runProposeJson.amount !== undefined) {
              const newAmount =
                runProposeJson.amount / 10 ** 8 -
                (donation && indexerServer.chainName === ChainNameEnum.mainChainName && !donationAddress
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
    [donation, indexerServer, defaultUnifiedAddress, validAddress, validAmount, validMemo, donationAddress,
    /* added */ spendable, maxAmount, somePending, stillConfirming, info.latestBlock],
    // The App have to re-calculate de fee if some of these data changed:
    // - spendable
    // - maxAmount
    // - somePending
    // - stillConfirming
    // - info.latestBlock
  );

  const calculateSpendableBalance = useCallback(
    async (addressPar: string): Promise<void> => {
      // if no address -> make no sense to run the propose
      if (!addressPar || validAddress !== 1) {
        defaultValuesSpendableMaxAmount();
        setSpendableBalanceLastError('');
        return;
      }
      // spendable TOTAL calculated
      let spendableBalance = totalBalance ? totalBalance.totalSpendableBalance : 0;
      let zenniesForZingo = donationAddress ? false : donation;
      //console.log('SPENDABLEBALANCE', addressPar, zenniesForZingo, spendableBalance);
      const start = Date.now();
      const runSpendableBalanceStr = await RPCModule.getSpendableBalanceWithAddressInfo(
        addressPar,
        zenniesForZingo ? 'true' : 'false',
      );
      if (Date.now() - start > 4000) {
        console.log('=========================================== > spendable balance with address - ', Date.now() - start);
      }
      console.log(runSpendableBalanceStr);
      if (runSpendableBalanceStr && runSpendableBalanceStr.toLowerCase().startsWith(GlobalConst.error)) {
        // snack with error
        console.log(runSpendableBalanceStr);
        setSpendableBalanceLastError(runSpendableBalanceStr);
        //Alert.alert('Calculating the FEE', runProposeStr);
      } else {
        try {
          const runSpendableBalanceJson: RPCSpendablebalanceType = await JSON.parse(runSpendableBalanceStr);
          if (runSpendableBalanceJson.spendable_balance) {
            console.log('SPENDABLEBALANCE result', runSpendableBalanceJson.spendable_balance);
            spendableBalance = runSpendableBalanceJson.spendable_balance / 10 ** 8;
            setSpendableBalanceLastError('');
          }
        } catch (e) {
          // snack with error
          console.log('SPENDABLEBALANCE error', runSpendableBalanceStr, e instanceof Error ? e.message : String(e));
          setSpendableBalanceLastError(runSpendableBalanceStr + ' ' + (e instanceof Error ? e.message : String(e)));
          //Alert.alert('Calculating the FEE', runProposeJson.error);
        }
      }

      setSpendable(spendableBalance);
      // max amount
      // don't need to substract the donation here.
      const max = spendableBalance;
      if (max > 0) {
        // if max have to be more than 0, then the user can send a memo with amount 0 & some fee.
        setMaxAmount(max);
        setNegativeMaxAmount(false);
      } else {
        // if max is 0 or less than 0 then the user CANNOT send anything  because of the fee
        setMaxAmount(0);
        setNegativeMaxAmount(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      defaultValuesSpendableMaxAmount,
      donation,
      donationAddress,
      totalBalance,
      totalBalance?.totalSpendableBalance,
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
      //Alert.alert('', addressPar);
      //setAddressText(addressPar);
      // Attempt to parse as URI if it starts with zcash
      if (addressPar.toLowerCase().startsWith(GlobalConst.zcash) || addressPar.toLowerCase().includes(':')) {
        const { error, target } = await parseZcashURI(addressPar, translate, indexerServer);

        if (target) {
          // redo the to addresses
          [target].forEach(tgt => {
            setAddressText(tgt.address || '');
            setAmountText(tgt.amount ? Utils.parseNumberFloatToStringLocale(tgt.amount, 8) : '');
            setMemoText(tgt.memoString || '');
          });
        }
        if (error) {
          // Show the error message as a toast
          addLastSnackbar({ message: error, screenName: [screenName] });
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
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => { s1.remove(); s2.remove(); };
  }, []);
  
  useEffect(() => {
    const stillConf =
      (totalBalance ? totalBalance.totalOrchardBalance : 0) !== (totalBalance ? totalBalance.confirmedOrchardBalance : 0) ||
      (totalBalance ? totalBalance.totalSaplingBalance : 0) !== (totalBalance ? totalBalance.confirmedSaplingBalance : 0) ||
      somePending;
    //const showUpgrade =
    //  (somePending ? 0 : totalBalance.transparentBal) === 0 && totalBalance.spendablePrivate > fee;
    setStillConfirming(stillConf);
  }, [
    shieldingAmount,
    somePending,
    totalBalance,
    totalBalance?.totalOrchardBalance,
    totalBalance?.totalSaplingBalance,
    totalBalance?.confirmedOrchardBalance,
    totalBalance?.confirmedSaplingBalance,
  ]);

  useEffect(() => {
    calculateFeeWithPropose(amountText, addressText, memoText, includeUAMemoBoolean);
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
    if (!addressText.toLowerCase().startsWith(GlobalConst.zcash)) {
      calculateSpendableBalance(addressText);
    }
  }, [calculateSpendableBalance, addressText]);

  useEffect(() => {
    const getMemoEnabled = async (address: string, serverChainName: string): Promise<boolean> => {
      return await Utils.isValidOrchardOrSaplingAddress(address, serverChainName);
    };

    if (addressText) {
      getMemoEnabled(addressText, indexerServer.chainName).then(r => {
        setMemoEnabled(r);
        if (!r) {
          setMemoText('');
        }
      });
    } else {
      setMemoEnabled(false);
      setMemoText('');
    }
  }, [indexerServer.chainName, addressText]);

  useEffect(() => {
    const parseAddress = async (
      address: string,
      serverChainName: string,
    ): Promise<{ isValid: boolean; onlyOrchardUA: string }> => {
      return await Utils.isValidAddress(address, serverChainName);
    };

    if (addressText) {
      parseAddress(addressText, indexerServer.chainName).then(r => {
        setValidAddress(r.isValid ? 1 : -1);
        if (!r.isValid) {
          setSpendableBalanceLastError('');
        }
      });
    } else {
      setValidAddress(0);
    }

    if (memoText || includeUAMemoBoolean) {
      const len = Utils.countMemoBytes(memoText, includeUAMemoBoolean, defaultUnifiedAddress);
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
    indexerServer.chainName,
    addressText,
    amountCurrencyText,
    amountText,
    memoText,
    includeUAMemoBoolean,
    spendable,
    fee,
    maxAmount,
    defaultUnifiedAddress,
  ]);

  useEffect(() => {
    setSendButtonEnabled(
      // send amount 0 with transparent address make no sense.
      // you always will get `dust` error.
      validAddress === 1 &&
        validAmount === 1 &&
        validMemo !== -1 &&
        fee > 0 &&
        maxAmount > 0 &&
        !(!memoEnabled && Utils.parseStringLocaleToNumberFloat(amountText) === 0),
    );
  }, [memoEnabled, amountText, validAddress, validAmount, validMemo, fee, maxAmount]);

  useEffect(() => {
    if (addressText) {
      (async () => {
        const donationA =
          addressText === (await Utils.getDonationAddress(indexerServer.chainName)) ||
          addressText === zenniesDonationAddress ||
          addressText === (await Utils.getNymDonationAddress(indexerServer.chainName));
        setDonationAddress(donationA);
      })();
    } else {
      setDonationAddress(false);
    }
  }, [addresses, addressText, indexerServer.chainName, zenniesDonationAddress]);

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

  const clearState = () => {
    setAddressText('');
    setAmountText('');
    setAmountCurrencyText('');
    setMemoText('');
    setIncludeUAMemoBoolean(false);
    clearToAddr();
    setSpendable(0);
    setSpendableBalanceLastError('');
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

  const confirmSend = async (sendPageStatePar: SendPageStateClass) => {
    if (!netInfo.isConnected || selectIndexerServer === SelectServerEnum.offline) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string, screenName: [screenName] });
      return;
    }

    navigation.navigate(RouteEnum.Computing);

    let error = '';
    let customError: string | undefined;
    try {
      const txid = await sendTransaction(sendPageStatePar);

      // Clear the fields
      clearState();

      // scroll to top in history, just in case.
      setScrollToTop(true);
      setScrollToBottom(true);

      createAlert(
        setBackgroundError,
        addLastSnackbar,
        [screenName, ScreenEnum.History],
        translate('send.confirm-title') as string,
        `${translate('send.Broadcast')} ${txid}`,
        true,
        translate,
      );
      // the app send successfully on the first attemp.

      navigation.navigate(RouteEnum.HomeStack, {
        screen: RouteEnum.History,
      });
      return;
    } catch (err1) {
      error = err1 as string;

      customError = interceptCustomError(error);

      // in this point the App is failing, there is two possibilities:
      // 1. Server Error
      // 2. Another type of Error
      // here is worth it to try again with the best working server...
      // if the user selected a `custom` server, then we cannot change it.
      if (!customError && selectIndexerServer !== SelectServerEnum.custom) {
        // try send again with a working server
        const serverChecked = await selectingServer(serverUris(translate).filter((s: ServerUrisType) => !s.obsolete));
        let fasterServer: ServerType = {} as ServerType;
        if (serverChecked && serverChecked.latency) {
          fasterServer = { uri: serverChecked.uri, chainName: serverChecked.chainName };
        } else {
          fasterServer = indexerServer;
          // likely here there is a internet conection problem
          // all of the servers return an error because they are unreachable probably.
          // the 30 seconds timout was fired.
        }
        console.log(serverChecked);
        console.log(fasterServer);
        if (fasterServer.uri !== indexerServer.uri) {
          setServerOption(fasterServer, selectIndexerServer, false, true);
        }

        try {
          const txid = await sendTransaction(sendPageStatePar);

          // Clear the fields
          clearState();

          // scroll to top in history, just in case.
          setScrollToTop(true);
          setScrollToBottom(true);

          createAlert(
            setBackgroundError,
            addLastSnackbar,
            [screenName, ScreenEnum.History],
            translate('send.confirm-title') as string,
            `${translate('send.Broadcast')} ${txid}`,
            true,
            translate,
          );
          // the app send successfully on the second attemp.

          navigation.navigate(RouteEnum.HomeStack, {
            screen: RouteEnum.History,
          });
          return;
        } catch (err2) {
          error = err2 as string;

          customError = interceptCustomError(error);
        }
      }
    }

    setTimeout(() => {
      //console.log('sendtx error', error);
      // if the App is in background I need to store the error
      // and when the App come back to foreground shows it to the user.
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        [screenName],
        translate('send.sending-error') as string,
        `${customError ? customError : error}`,
        false,
        translate,
        sendEmail,
        zingolibVersion,
      );
    }, 1 * 1000);

    navigation.navigate(RouteEnum.HomeStack, {
      screen: RouteEnum.History,
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

  const setQrcodeModalShow = () => {
    navigation.navigate(RouteEnum.ScannerAddress, { 
      setAddress: (a: string) => updateToField(a, null, null, null, null),
      active: true,
    })
  };

  const setConfirmModalShow = async (parseAddressInfoJSON: RPCParseAddressType) => {
    navigation.navigate(RouteEnum.ConfirmStack, {
      screen: RouteEnum.Confirm,
      params: {
        calculatedFee: fee,
        parseAddressInfoJSON: parseAddressInfoJSON,
        donationAmount:
          donation && indexerServer.chainName === ChainNameEnum.mainChainName && !donationAddress
            ? Utils.parseStringLocaleToNumberFloat(Utils.getZenniesDonationAmount())
            : 0,
        confirmSend: confirmSend,
        sendAllAmount:
          mode !== ModeEnum.basic &&
          Utils.parseStringLocaleToNumberFloat(amountText) ===
            Utils.parseStringLocaleToNumberFloat(maxAmount.toFixed(8)),
        calculateFeeWithPropose: calculateFeeWithPropose,
        sendPageState: buildSendState(),
      }
    });
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
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        style={{ 
          flex: 1, 
          backgroundColor: colors.background,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : kbOpen ? insets.top : 0}
      >
      
        <View style={{
          position: 'absolute',
          width: 75,
          top: 10,
          left: 10,
          zIndex: 999,
        }}>
          <View
            style={{
              borderRadius: 25,
              borderColor: colors.text,
              borderWidth: 1,
              padding: 10,
              margin: 10,
              backgroundColor: colors.background,
            }}>
              <TouchableOpacity onPress={() => {
                clear();
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              }}>
                <FontAwesomeIcon
                  size={30}
                  icon={faChevronLeft}
                  color={colors.text}
                />
              </TouchableOpacity>
          </View>
        </View>
      
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 16,
          }}>
          <View
            style={{
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}>

            <RegText color={colors.text} style={{ fontSize: 25 }}>Send</RegText>

            <FadeText style={{ marginBottom: 20, marginTop: 5 }}>texto</FadeText>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 5 }}>
              <RegText style={{ marginHorizontal: 10 }}>{'To:'}</RegText>
              {validAddress === 1 && (
                <View testID="send.address.check">
                  <FontAwesomeIcon icon={faCheck} color={colors.primary} style={{ marginHorizontal: 10 }} />
                </View>
              )}
              {validAddress === -1 && (
                <ErrorText testID="send.address.error" style={{ marginHorizontal: 10 }}>{translate('send.invalidaddress') as string}</ErrorText>
              )}
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 25,
                marginBottom: 10,
                backgroundColor: colors.secondary,
                width: '100%',
                maxWidth: maxW,
                minWidth: '50%',
                minHeight: 48,
                alignItems: 'center',
                paddingHorizontal: 25,
                paddingVertical: 7,
              }}>
              <TextInput
                placeholder='Paste the Address'
                placeholderTextColor={colors.placeholder}
                testID="import.seedufvkinput"
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  color: colors.text,
                  fontWeight: '600',
                  fontSize: 16,
                  minHeight: 48,
                  marginLeft: 5,
                  backgroundColor: 'transparent',
                }}
                value={addressText}
                onChangeText={(text: string) => {
                  updateToField(text, null, null, null, null);
                }}
                editable={true}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              {!!addressText && (
                <TouchableOpacity 
                  onPress={() => {
                    updateToField('', null, null, null, null);
                }}>
                  <View 
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: colors.zingo,
                      borderRadius: 11,
                      height: 22,
                      width: 22,
                      padding: 0,
                  }}>
                    <RegText style={{ color: colors.background, marginTop: -3 }}>x</RegText>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID="send.scan-button"
                accessible={true}
                accessibilityLabel={translate('send.scan-acc') as string}
                onPress={() => {
                  setQrcodeModalShow();
                }}>
                <FontAwesomeIcon style={{ marginLeft: 10 }} size={22} icon={faQrcode} color={colors.border} />
              </TouchableOpacity>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 5 }}>
              {validAmount === -1 && <ErrorText>{translate('send.invalidnumber') as string}</ErrorText>}
              {validAmount === -2 && <ErrorText>{translate('send.invalidamount') as string}</ErrorText>}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 25,
                  marginBottom: 10,
                  backgroundColor: colors.secondary,
                  width: '50%',
                  maxWidth: maxW,
                  minWidth: '50%',
                  minHeight: 48,
                  alignItems: 'center',
                  paddingHorizontal: 25,
                  paddingVertical: 2,
                }}>
                <TextInput
                  placeholder={`0${decimalSeparator}00000`}
                  placeholderTextColor={colors.placeholder}
                  style={{
                    flexGrow: 1,
                    flexShrink: 1,
                    color: colors.text,
                    fontWeight: '600',
                    fontSize: 25,
                    minHeight: 48,
                    marginLeft: 5,
                    backgroundColor: 'transparent',
                  }}
                  value={amountText}
                  onChangeText={(text: string) => updateToField(null, text.substring(0, 20), null, null, null)}
                  onEndEditing={(e: NativeSyntheticEvent<TextInputEndEditingEventData>) => {
                    updateToField(null, e.nativeEvent.text.substring(0, 20), null, null, null);
                    calculateFeeWithPropose(
                      e.nativeEvent.text.substring(0, 20),
                      addressText,
                      memoText,
                      includeUAMemoBoolean,
                    );
                  }}
                  editable={true}
                  maxLength={20}
                  keyboardType="numeric"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
                {!!amountText && (
                  <TouchableOpacity 
                    onPress={() => {
                      updateToField(null, '', '', null, null);
                  }}>
                    <View 
                      style={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: colors.zingo,
                        borderRadius: 11,
                        height: 22,
                        width: 22,
                        padding: 0,
                    }}>
                      <RegText style={{ color: colors.background, marginTop: -3 }}>x</RegText>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              <RegText style={{ fontSize: 36 }}>{' ' + (info.currencyName ? info.currencyName : '---')}</RegText>
            </View>

            <View style={{ display: 'flex', flexDirection: 'column' }}>

              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <TouchableOpacity
                  onPress={() => {
                    if (spendableBalanceLastError && mode === ModeEnum.advanced) {
                      Alert.alert(
                        'Available',
                        spendableBalanceLastError,
                        [
                          {
                            text: translate('support') as string,
                            onPress: async () =>
                              sendEmail(
                                translate,
                                zingolibVersion,
                                'Available',
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
                      {'Available:'}
                    </RegText>
                    <ZecAmount
                      currencyName={info.currencyName}
                      color={
                        stillConfirming ||
                        negativeMaxAmount ||
                        (spendableBalanceLastError && mode === ModeEnum.advanced)
                          ? 'red'
                          : colors.text
                      }
                      size={15}
                      amtZec={maxAmount}
                      privacy={privacy}
                      style={{ fontWeight: '900' }}
                    />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    //if (fee > 0) {
                    updateToField(null, Utils.parseNumberFloatToStringLocale(maxAmount, 5), null, null, null);
                    //}
                    calculateFeeWithPropose(
                      Utils.parseNumberFloatToStringLocale(maxAmount, 5),
                      addressText,
                      memoText,
                      includeUAMemoBoolean,
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
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      marginLeft: 10,
                      backgroundColor: colors.secondary,
                    }}>
                    <RegText style={{ fontSize: 14 }} color={colors.text}>{'Max.'}</RegText>
                  </View>
                </TouchableOpacity>
              </View>

              {validAddress !== 0 && validAmount !== 0 &&
              (fee > 0 || !!proposeSendLastError) && (
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
                                  zingolibVersion,
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
                <TouchableOpacity onPress={() => {
                    navigation.navigate(RouteEnum.Pools);
                  }}
                >
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
            </View>

            {memoEnabled === true && false && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 5 }}>
                  <RegText style={{ marginHorizontal: 10 }}>{'Memo:'}</RegText>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 25,
                    marginBottom: 10,
                    backgroundColor: colors.secondary,
                    width: '100%',
                    maxWidth: maxW,
                    minWidth: '50%',
                    minHeight: 48,
                    alignItems: 'center',
                    paddingHorizontal: 25,
                    paddingVertical: 7,
                  }}>
                  <TextInput
                    placeholder='Write a message'
                    placeholderTextColor={colors.placeholder}
                    testID="import.seedufvkinput"
                    multiline
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      color: colors.text,
                      fontWeight: '600',
                      fontSize: 16,
                      minHeight: 100,
                      marginHorizontal: 5,
                      backgroundColor: 'transparent',
                      textAlignVertical: 'top',
                    }}
                    value={memoText}
                    onChangeText={(text: string) => {
                      updateToField(null, !amountText && !!text ? '0' : null, null, text, null);
                    }}
                    onEndEditing={(e: NativeSyntheticEvent<TextInputEndEditingEventData>) => {
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
                      );
                    }}
                    maxLength={GlobalConst.memoMaxLength}
                    editable={true}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                  {!!memoText && (
                    <TouchableOpacity 
                      onPress={() => {
                        updateToField(null, null, null, '', null);
                    }}>
                      <View 
                        style={{
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: colors.zingo,
                          borderRadius: 11,
                          height: 22,
                          width: 22,
                          padding: 0,
                      }}>
                        <RegText style={{ color: colors.background, marginTop: -3 }}>x</RegText>
                      </View>
                    </TouchableOpacity>
                  )}
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
                      }}>{`${Utils.countMemoBytes(memoText, includeUAMemoBoolean, defaultUnifiedAddress)} `}</FadeText>
                    <FadeText style={{ marginTop: 0, fontSize: 12.5 }}>{translate('loadedapp.of') as string}</FadeText>
                    <FadeText style={{ marginTop: 0, fontSize: 12.5 }}>
                      {' ' + GlobalConst.memoMaxLength.toString() + ' '}
                    </FadeText>
                  </View>
                )}
              </>
            )}

          </View>
        </ScrollView>
        <View
          style={{
            marginTop: 'auto',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: 20,
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
            onPress={async () => {
              setSendButtonEnabled(false);
              updateToField(null, null, null, memoText, null);
              // donation - a Zenny is the minimum
              if (
                indexerServer.chainName === ChainNameEnum.mainChainName &&
                donationAddress &&
                Utils.parseStringLocaleToNumberFloat(amountText) <
                  Utils.parseStringLocaleToNumberFloat(Utils.getZenniesDonationAmount())
              ) {
                addLastSnackbar({ message: `${translate('send.donation-minimum-message') as string}`, screenName: [screenName] });
                updateToField(null, Utils.getZenniesDonationAmount(), null, null, false);
                return;
              }
              if (!netInfo.isConnected || selectIndexerServer === SelectServerEnum.offline) {
                addLastSnackbar({ message: translate('loadedapp.connection-error') as string, screenName: [screenName] });
                return;
              }
              if (
                validAmount === 1 &&
                amountText &&
                mode !== ModeEnum.basic &&
                Utils.parseStringLocaleToNumberFloat(amountText) ===
                  Utils.parseStringLocaleToNumberFloat(maxAmount.toFixed(8))
              ) {
                addLastSnackbar({ message: `${translate('send.sendall-message') as string}`, screenName: [screenName] });
              }
              // if the address is transparent - clean the memo field Just in Case.
              if (!memoEnabled) {
                setMemoText('');
                updateToField(null, null, null, '', false);
              }
              // calculating for Privacy Level
              let parseAddressInfoJSON: RPCParseAddressType;
              const result: string = await RPCModule.parseAddressInfo(addressText);
              if (result) {
                if (result.toLowerCase().startsWith(GlobalConst.error)) {
                  parseAddressInfoJSON = {} as RPCParseAddressType;
                } else {
                  try {
                    parseAddressInfoJSON = await JSON.parse(result);
                  } catch (e) {
                    //console.log(e);
                    parseAddressInfoJSON = {} as RPCParseAddressType;
                  }
                }
              } else {
                parseAddressInfoJSON = {} as RPCParseAddressType;
              }
              setConfirmModalShow(parseAddressInfoJSON);
              Keyboard.dismiss();
              setSendButtonEnabled(true);
            }}
            twoButtons={false}
          />
          {false && (
            <Button
              type={ButtonTypeEnum.Secondary}
              style={{ marginLeft: 10 }}
              title={translate('send.clear') as string}
              onPress={() => {
                defaultValueFee();
                defaultValuesSpendableMaxAmount();
                clearState();
                Keyboard.dismiss();
              }}
              twoButtons={true}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );

  return returnPage;
};

export default Send;
