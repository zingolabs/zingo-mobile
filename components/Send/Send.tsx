/* eslint-disable react-native/no-inline-styles */
import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  ScrollView,
  Keyboard,
  TextInput,
  TouchableOpacity,
  Platform,
  Text,
  Alert,
  NativeSyntheticEvent,
  TextInputEndEditingEventData,
  TextInputContentSizeChangeEventData,
} from 'react-native';
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
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import { getNumberFormatSettings } from 'react-native-localize';
import RNPickerSelect from 'react-native-picker-select';

import { SvgXml } from 'react-native-svg';
import FadeText from '../Components/FadeText';
import BoldText from '../Components/BoldText';
import NymOn from '../../assets/img/nym-on.svg';
import NymOff from '../../assets/img/nym-off.svg';
import SwitchOn from '../../assets/img/nym-switch-on.svg';
import SwitchOff from '../../assets/img/switch-off.svg';
import Swap from '../../assets/img/swap.svg';
import ErrorText from '../Components/ErrorText';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import CurrencyAmount from '../Components/CurrencyAmount';
import Button from '../Components/Button';
import {
  AddressBookFileClass,
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
  RouteEnum,
  SecurityType,
  ScreenEnum,
} from '../../app/AppState';
import { parseZcashURI, serverUris } from '../../app/uris';
import RPCModule from '../../app/RPCModule';
import Utils from '../../app/utils';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import PriceFetcher from '../Components/PriceFetcher';
import Header from '../Header';
import { createAlert } from '../../app/createAlert';
import AddressItem from '../Components/AddressItem';
import { RPCSendProposeType } from '../../app/walletBackend/types/RPCSendProposeType';
import ShowAddressAlertAsync from './components/ShowAddressAlertAsync';
import { sendEmail } from '../../app/sendEmail';
import selectingServer from '../../app/selectingServer';
import { RPCParseAddressType } from '../../app/walletBackend/types/RPCParseAddressType';
import { RPCSpendablebalanceType } from '../../app/walletBackend/types/RPCSpendablebalanceType';
import { DrawerScreenProps } from '@react-navigation/drawer';

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
  toggleMenuDrawer,
  setShieldingAmount,
  setScrollToTop,
  setScrollToBottom,
  setServerOption,
  //setSecurityOption,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    info,
    totalBalance,
    sendPageState,
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
    donation,
    addresses,
    defaultUnifiedAddress,
    shieldingAmount,
    selectServer,
    setZecPrice,
    zenniesDonationAddress,
    //security,
    currency,
    zingolibVersion,
    setPrivacyOption,
    nym: nymContext,
  } = context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.Send;
  const zecIconXml = `<?xml version="1.0" encoding="UTF-8"?>
  <svg viewBox="0 0 88.03 147.85">
    <polygon points="34.44 107.62 34.44 106.98 87.19 34.17 87.19 20.12 56.09 20.12 56.09 0 35.98 0 35.98 20.12 5.04 20.12 5.04 40.24 53.93 40.24 53.93 40.88 0 114.64 0 127.73 35.98 127.73 35.98 147.85 56.09 147.85 56.09 127.73 88.03 127.73 88.03 107.62 34.44 107.62"/>
  </svg>`;

  const [nym, setNym] = useState<boolean>(nymContext);
  const [memoEnabled, setMemoEnabled] = useState<boolean>(false);
  const [validAddress, setValidAddress] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [validAmount, setValidAmount] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - Invalid number, -2 - Invalid Amount
  const [validMemo, setValidMemo] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [sendButtonEnabled, setSendButtonEnabled] = useState<boolean>(false);
  const [itemsPicker, setItemsPicker] = useState<
    { label: string; value: string }[]
  >([]);
  const [memoIcon, setMemoIcon] = useState<boolean>(false);
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [spendable, setSpendable] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);
  const [stillConfirming, setStillConfirming] = useState<boolean>(false);
  const [showShieldInfo, setShowShieldInfo] = useState<boolean>(false);
  const [updatingToField, setUpdatingToField] = useState<boolean>(false);
  const [donationAddress, setDonationAddress] = useState<boolean>(false);
  const [negativeMaxAmount, setNegativeMaxAmount] = useState<boolean>(false);
  const [inputZec, setInputZec] = useState<boolean>(true);
  //const [sendAllClick, setSendAllClick] = useState<boolean>(false);
  const [proposeSendLastError, setProposeSendLastError] = useState<string>('');
  const [spendableBalanceLastError, setSpendableBalanceLastError] =
    useState<string>('');
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [pickerTempSelectedAddress, setPickerTempSelectedAddress] =
    useState<string>('');
  const [addressText, setAddressText] = useState<string>(
    sendPageState.toaddr.to,
  );
  const [memoText, setMemoText] = useState<string>(sendPageState.toaddr.memo);
  const [amountText, setAmountText] = useState<string>(
    sendPageState.toaddr.amount,
  );
  const [amountCurrencyText, setAmountCurrencyText] = useState<string>(
    sendPageState.toaddr.amountCurrency,
  );
  const [includeUAMemoBoolean, setIncludeUAMemoBoolean] = useState<boolean>(
    sendPageState.toaddr.includeUAMemo,
  );
  const [keyboardListenersDone, setKeyboardListenersDone] =
    useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const feeCalculationGenRef = useRef<number>(0);
  const { decimalSeparator } = getNumberFormatSettings();

  const runSendPropose = async (proposeJSON: string): Promise<string> => {
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
      (donation &&
      server.chainName === ChainNameEnum.mainChainName &&
      !donationAddress
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
    server.chainName,
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
      const generation = feeCalculationGenRef.current;

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

      const sendPageStateCalculateFee = new SendPageStateClass(
        new ToAddrClass(0),
      );
      sendPageStateCalculateFee.toaddr.to = addressPar;
      sendPageStateCalculateFee.toaddr.memo = memoPar;
      sendPageStateCalculateFee.toaddr.includeUAMemo = includeUAMemoPar;
      sendPageStateCalculateFee.toaddr.amount = amountPar;

      sendJson = await Utils.getSendManyJSON(
        sendPageStateCalculateFee,
        defaultUnifiedAddress,
        server,
        donation,
      );
      // fee
      let proposeFee = 0;
      const runProposeStr = await runSendPropose(JSON.stringify(sendJson));

      // discard result if a newer calculation (or a clear) has superseded this one
      if (feeCalculationGenRef.current !== generation) {
        return;
      }

      //Alert.alert('Calculating the FEE ' + command, runProposeStr);
      if (
        runProposeStr &&
        runProposeStr.toLowerCase().startsWith(GlobalConst.error)
      ) {
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
                (donation &&
                server.chainName === ChainNameEnum.mainChainName &&
                !donationAddress
                  ? Utils.parseStringLocaleToNumberFloat(
                      Utils.getZenniesDonationAmount(),
                    )
                  : 0);
              console.log('AMOUNT', newAmount);
              updateToField(
                null,
                Utils.parseNumberFloatToStringLocale(newAmount, 8),
                null,
                null,
                null,
              );
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
    [
      donation,
      server,
      defaultUnifiedAddress,
      validAddress,
      validAmount,
      validMemo,
      donationAddress,
      /* added */ spendable,
      maxAmount,
      somePending,
      stillConfirming,
      info.latestBlock,
    ],
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
      let spendableBalance = totalBalance
        ? totalBalance.totalSpendableBalance
        : 0;
      let zenniesForZingo = donationAddress ? false : donation;
      const start = Date.now();
      const runSpendableBalanceStr =
        await RPCModule.getSpendableBalanceWithAddressInfo(
          addressPar,
          zenniesForZingo ? 'true' : 'false',
        );
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > spendable balance with address - ',
          Date.now() - start,
        );
      }
      console.log(runSpendableBalanceStr);
      if (
        runSpendableBalanceStr &&
        runSpendableBalanceStr.toLowerCase().startsWith(GlobalConst.error)
      ) {
        // snack with error
        console.log(runSpendableBalanceStr);
        setSpendableBalanceLastError(runSpendableBalanceStr);
        //Alert.alert('Calculating the FEE', runProposeStr);
      } else {
        try {
          const runSpendableBalanceJson: RPCSpendablebalanceType =
            await JSON.parse(runSpendableBalanceStr);
          if (runSpendableBalanceJson.spendable_balance) {
            console.log(
              'SPENDABLEBALANCE result',
              runSpendableBalanceJson.spendable_balance,
            );
            spendableBalance =
              runSpendableBalanceJson.spendable_balance / 10 ** 8;
            setSpendableBalanceLastError('');
          }
        } catch (e) {
          // snack with error
          console.log(
            'SPENDABLEBALANCE error',
            runSpendableBalanceStr,
            e instanceof Error ? e.message : String(e),
          );
          setSpendableBalanceLastError(
            runSpendableBalanceStr +
              ' ' +
              (e instanceof Error ? e.message : String(e)),
          );
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
      if (
        addressPar.toLowerCase().startsWith(GlobalConst.zcash) ||
        addressPar.toLowerCase().includes(':')
      ) {
        const { error, target } = await parseZcashURI(
          addressPar,
          translate,
          server,
        );

        if (target) {
          // redo the to addresses
          [target].forEach(tgt => {
            if (tgt.address) {
              setAddressText(tgt.address);
            }
            if (tgt.amount) {
              setAmountText(
                Utils.parseNumberFloatToStringLocale(tgt.amount, 8),
              );
            }
            if (tgt.memoString) {
              setMemoText(tgt.memoString);
            }
          });
        }
        if (error) {
          // Show the error message as a toast
          addLastSnackbar(error);
        }
      } else {
        setAddressText(addressPar.replace(/[ \t\n\r]+/g, '')); // Remove spaces
      }
    }

    if (amountPar !== null) {
      const amountTemp = amountPar.substring(0, 20);
      if (isNaN(Utils.parseStringLocaleToNumberFloat(amountTemp))) {
        setAmountCurrencyText('');
      } else if (amountTemp && zecPrice && zecPrice.zecPrice > 0) {
        setAmountCurrencyText(
          Utils.parseNumberFloatToStringLocale(
            Utils.parseStringLocaleToNumberFloat(amountTemp) *
              zecPrice.zecPrice,
            2,
          ),
        );
      } else {
        setAmountCurrencyText('');
      }
      setAmountText(amountTemp);
    }

    if (amountCurrencyPar !== null) {
      const amountCurrencyTemp = amountCurrencyPar.substring(0, 15);
      if (isNaN(Utils.parseStringLocaleToNumberFloat(amountCurrencyTemp))) {
        setAmountText('');
      } else if (amountCurrencyTemp && zecPrice && zecPrice.zecPrice > 0) {
        setAmountText(
          Utils.parseNumberFloatToStringLocale(
            Utils.parseStringLocaleToNumberFloat(amountCurrencyTemp) /
              zecPrice.zecPrice,
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
    setNym(nymContext);
  }, [nymContext]);

  useEffect(() => {
    const stillConf =
      (totalBalance ? totalBalance.totalOrchardBalance : 0) !==
        (totalBalance ? totalBalance.confirmedOrchardBalance : 0) ||
      (totalBalance ? totalBalance.totalSaplingBalance : 0) !==
        (totalBalance ? totalBalance.confirmedSaplingBalance : 0) ||
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
    totalBalance?.totalOrchardBalance,
    totalBalance?.totalSaplingBalance,
    totalBalance?.confirmedOrchardBalance,
    totalBalance?.confirmedSaplingBalance,
  ]);

  useEffect(() => {
    calculateFeeWithPropose(
      amountText,
      addressText,
      memoText,
      includeUAMemoBoolean,
    );
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
    const getMemoEnabled = async (
      address: string,
      serverChainName: string,
    ): Promise<boolean> => {
      return await Utils.isValidOrchardOrSaplingAddress(
        address,
        serverChainName,
      );
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
      const len = Utils.countMemoBytes(
        memoText,
        includeUAMemoBoolean,
        defaultUnifiedAddress,
      );
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
        !(
          !memoEnabled && Utils.parseStringLocaleToNumberFloat(amountText) === 0
        ),
    );
  }, [
    memoEnabled,
    amountText,
    validAddress,
    validAmount,
    validMemo,
    fee,
    maxAmount,
  ]);

  useEffect(() => {
    const items = addressBook
      .filter(
        (item: AddressBookFileClass) => item.address !== zenniesDonationAddress,
      )
      .map((item: AddressBookFileClass) => ({
        label: item.label,
        value: item.address,
      }));
    setItemsPicker(items);
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
      });
      Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardVisible(false);
      });
    }
  };

  const clearState = () => {
    feeCalculationGenRef.current += 1;
    setAddressText('');
    setAmountText('');
    setAmountCurrencyText('');
    setMemoText('');
    setIncludeUAMemoBoolean(false);
    clearToAddr();
    setSpendable(0);
    setSpendableBalanceLastError('');
    setNym(nymContext);
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
    if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
      addLastSnackbar(translate('loadedapp.connection-error') as string);
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
      if (!customError && selectServer !== SelectServerEnum.custom) {
        // try send again with a working server
        const serverChecked = await selectingServer(
          serverUris(translate).filter((s: ServerUrisType) => !s.obsolete),
        );
        let fasterServer: ServerType = {} as ServerType;
        if (serverChecked && serverChecked.latency) {
          fasterServer = {
            uri: serverChecked.uri,
            chainName: serverChecked.chainName,
          };
        } else {
          fasterServer = server;
          // likely here there is a internet conection problem
          // all of the servers return an error because they are unreachable probably.
          // the 15 seconds timout was fired.
        }
        console.log(serverChecked);
        console.log(fasterServer);
        if (fasterServer.uri !== server.uri) {
          setServerOption(fasterServer, selectServer, false, true);
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

  const scrollToEnd = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: contentHeight, animated: true });
    }
  };

  const setQrcodeModalShow = () => {
    navigation.navigate(RouteEnum.ScannerAddress, {
      setAddress: (a: string) => updateToField(a, null, null, null, null),
      active: true,
    });
  };

  const setMemoModalShow = () => {
    navigation.navigate(RouteEnum.Memo, {
      message: memoText,
      includeUAMessage: includeUAMemoBoolean,
      setMessage: setMemoText,
    });
  };

  const setConfirmModalShow = async (
    parseAddressInfoJSON: RPCParseAddressType,
  ) => {
    navigation.navigate(RouteEnum.ConfirmStack, {
      screen: RouteEnum.Confirm,
      params: {
        calculatedFee: fee,
        parseAddressInfoJSON: parseAddressInfoJSON,
        donationAmount:
          donation &&
          server.chainName === ChainNameEnum.mainChainName &&
          !donationAddress
            ? Utils.parseStringLocaleToNumberFloat(
                Utils.getZenniesDonationAmount(),
              )
            : 0,
        confirmSend: confirmSend,
        sendAllAmount:
          mode !== ModeEnum.basic &&
          Utils.parseStringLocaleToNumberFloat(amountText) ===
            Utils.parseStringLocaleToNumberFloat(maxAmount.toFixed(8)),
        calculateFeeWithPropose: calculateFeeWithPropose,
        sendPageState: buildSendState(),
        nym: nym,
      },
    });
  };

  //  'Render, spendable',
  //  spendable,
  //  'maxAmount',
  //  maxAmount,
  //  'Fee',
  //  fee,
  //  keyboardVisible,
  //  contentHeight,
  //);

  const returnPage = (
    <View>
      <View
        accessible={true}
        accessibilityLabel={translate('send.title-acc') as string}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '100%',
          height: '100%',
          marginBottom: 200,
        }}
      >
        <View
          onLayout={e => {
            const { height } = e.nativeEvent.layout;
            keyboardListeners(height);
          }}
        >
          <Header
            title={translate('send.title') as string}
            screenName={screenName}
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
          testID="send.scroll-view"
        >
          <View
            style={{
              marginBottom:
                Platform.OS === GlobalConst.platformOSandroid ? 30 : 250,
            }}
          >
            <View
              style={{
                display: 'flex',
                padding: 10,
                paddingTop: 5,
                marginTop: 0,
              }}
            >
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ display: 'flex', flexDirection: 'row' }}>
                  <RegText style={{ marginRight: 10 }}>
                    {translate('send.toaddress') as string}
                  </RegText>
                  {validAddress === 1 && (
                    <AddressItem
                      address={addressText}
                      screenName={screenName}
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
                  <ErrorText testID="send.address.error">
                    {translate('send.invalidaddress') as string}
                  </ErrorText>
                )}
              </View>
              <View
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderRadius: 5,
                  borderColor: colors.text,
                  marginTop: 5,
                }}
              >
                <View style={{ flexDirection: 'row' }}>
                  <View
                    accessible={true}
                    accessibilityLabel={translate('send.address-acc') as string}
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                    }}
                  >
                    <TextInput
                      testID="send.addressplaceholder"
                      placeholder={
                        translate('send.addressplaceholder') as string
                      }
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
                    }}
                  >
                    {addressText && (
                      <TouchableOpacity
                        onPress={() => {
                          updateToField('', null, null, null, null);
                        }}
                      >
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
                            key={itemsPicker.length}
                            style={{
                              modalViewBottom: {
                                minHeight: 300,
                              },
                            }}
                            pickerProps={{
                              mode: 'dialog',
                              itemStyle: {
                                color: colors.background,
                              },
                            }}
                            fixAndroidTouchableBug={true}
                            value={
                              pickerTempSelectedAddress &&
                              Platform.OS === GlobalConst.platformOSios
                                ? (pickerTempSelectedAddress ?? ' ')
                                : (addressText ?? ' ')
                            }
                            items={itemsPicker}
                            placeholder={{
                              label: translate(
                                'addressbook.select-placeholder',
                              ) as string,
                              value: null,
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
                                    updateToField(
                                      pickerTempSelectedAddress,
                                      null,
                                      null,
                                      null,
                                      null,
                                    );
                                  })
                                  .catch(() => {
                                    updateToField(
                                      addressText,
                                      null,
                                      null,
                                      null,
                                      null,
                                    );
                                  });
                                setTimeout(() => {
                                  setUpdatingToField(false);
                                }, 500);
                              } else if (
                                addressText !== pickerTempSelectedAddress
                              ) {
                                updateToField(
                                  pickerTempSelectedAddress,
                                  null,
                                  null,
                                  null,
                                  null,
                                );
                              }
                              setPickerTempSelectedAddress('');
                            }}
                            onValueChange={async (itemValue: string) => {
                              // only for Android
                              if (
                                Platform.OS === GlobalConst.platformOSandroid
                              ) {
                                if (
                                  validAddress === 1 &&
                                  addressText &&
                                  itemValue &&
                                  addressText !== itemValue
                                ) {
                                  setUpdatingToField(true);
                                  await ShowAddressAlertAsync(translate)
                                    .then(() => {
                                      updateToField(
                                        itemValue,
                                        null,
                                        null,
                                        null,
                                        null,
                                      );
                                    })
                                    .catch(() => {
                                      updateToField(
                                        addressText,
                                        null,
                                        null,
                                        null,
                                        null,
                                      );
                                    });
                                  setTimeout(() => {
                                    setUpdatingToField(false);
                                  }, 500);
                                } else if (addressText !== itemValue) {
                                  updateToField(
                                    itemValue,
                                    null,
                                    null,
                                    null,
                                    null,
                                  );
                                }
                              } else {
                                setPickerTempSelectedAddress(itemValue);
                              }
                            }}
                          >
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
                      }}
                    >
                      <FontAwesomeIcon
                        style={{ marginRight: 5 }}
                        size={35}
                        icon={faQrcode}
                        color={colors.border}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 10,
                }}
              >
                <View
                  style={{ flexDirection: 'row', justifyContent: 'flex-end' }}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      borderRadius: 10,
                      margin: 0,
                      padding: 0,
                      paddingBottom: 3,
                    }}
                  >
                    <FadeText>{`${translate('send.amount')}`}</FadeText>
                  </View>
                  {sendAll && mode !== ModeEnum.basic && (
                    <TouchableOpacity
                      onPress={() => {
                        //if (fee > 0) {
                        updateToField(
                          null,
                          Utils.parseNumberFloatToStringLocale(maxAmount, 8),
                          null,
                          null,
                          null,
                        );
                        //}
                        calculateFeeWithPropose(
                          Utils.parseNumberFloatToStringLocale(maxAmount, 8),
                          addressText,
                          memoText,
                          includeUAMemoBoolean,
                        );
                        //setSendAllClick(true);
                        //setTimeout(() => {
                        //  setSendAllClick(false);
                        //}, 1000);
                      }}
                    >
                      <View
                        style={{
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          borderRadius: 10,
                          margin: 0,
                          padding: 0,
                          marginLeft: 10,
                        }}
                      >
                        <RegText color={colors.primary}>
                          {translate('send.sendall') as string}
                        </RegText>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
                {validAmount === -1 && (
                  <ErrorText>
                    {translate('send.invalidnumber') as string}
                  </ErrorText>
                )}
                {validAmount === -2 && (
                  <ErrorText>
                    {translate('send.invalidamount') as string}
                  </ErrorText>
                )}
              </View>

              <View style={{ display: 'flex', flexDirection: 'column' }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 5,
                  }}
                >
                  {inputZec ? (
                    <SvgXml
                      width={12}
                      height={20}
                      xml={zecIconXml}
                      fill={colors.text}
                      style={{ marginRight: 5 }}
                    />
                  ) : (
                    <RegText style={{ marginRight: 5, fontSize: 20 }}>
                      $
                    </RegText>
                  )}
                  <View
                    accessible={true}
                    accessibilityLabel={
                      inputZec
                        ? (translate('send.zec-acc') as string)
                        : (translate('send.usd-acc') as string)
                    }
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderRadius: 5,
                      borderColor: colors.text,
                      minWidth: 48,
                      minHeight: 48,
                    }}
                  >
                    {inputZec ? (
                      <TextInput
                        testID="send.amount"
                        placeholder={`#${decimalSeparator}########`}
                        placeholderTextColor={colors.placeholder}
                        keyboardType="numeric"
                        style={{
                          flex: 1,
                          color: colors.text,
                          fontWeight: '600',
                          fontSize: 16,
                          minHeight: 48,
                          marginLeft: 5,
                          backgroundColor: 'transparent',
                        }}
                        value={amountText}
                        onChangeText={(text: string) =>
                          updateToField(
                            null,
                            text.substring(0, 20),
                            null,
                            null,
                            null,
                          )
                        }
                        editable={true}
                        maxLength={20}
                      />
                    ) : (
                      <TextInput
                        placeholder={`#${decimalSeparator}##`}
                        placeholderTextColor={colors.placeholder}
                        keyboardType="numeric"
                        style={{
                          flex: 1,
                          color: colors.text,
                          fontWeight: '600',
                          fontSize: 16,
                          minHeight: 48,
                          marginLeft: 5,
                          backgroundColor: 'transparent',
                        }}
                        value={amountCurrencyText}
                        onChangeText={(text: string) =>
                          updateToField(
                            null,
                            null,
                            text.substring(0, 15),
                            null,
                            null,
                          )
                        }
                        editable={true}
                        maxLength={15}
                      />
                    )}
                    {(inputZec ? amountText : amountCurrencyText) ? (
                      <TouchableOpacity
                        onPress={() =>
                          inputZec
                            ? updateToField(null, '', null, null, null)
                            : updateToField(null, null, '', null, null)
                        }
                      >
                        <FontAwesomeIcon
                          style={{ marginRight: 5 }}
                          size={20}
                          icon={faXmark}
                          color={colors.primaryDisabled}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {(currency === CurrencyEnum.USDCurrency ||
                    currency === CurrencyEnum.USDTORCurrency) && (
                    <>
                      <TouchableOpacity
                        onPress={() => {
                          if (
                            inputZec &&
                            !amountCurrencyText &&
                            amountText &&
                            zecPrice.zecPrice > 0
                          ) {
                            const zecVal =
                              Utils.parseStringLocaleToNumberFloat(amountText);
                            if (!isNaN(zecVal)) {
                              setAmountCurrencyText(
                                Utils.parseNumberFloatToStringLocale(
                                  zecVal * zecPrice.zecPrice,
                                  2,
                                ),
                              );
                            }
                          }
                          setInputZec(!inputZec);
                        }}
                        disabled={!zecPrice.zecPrice || zecPrice.zecPrice <= 0}
                        style={{ marginHorizontal: 8 }}
                      >
                        <Swap
                          width={28}
                          height={28}
                          color={
                            !zecPrice.zecPrice || zecPrice.zecPrice <= 0
                              ? colors.primaryDisabled
                              : colors.primary
                          }
                        />
                      </TouchableOpacity>
                      {inputZec ? (
                        <CurrencyAmount
                          style={{ marginTop: 0, marginBottom: 0 }}
                          price={zecPrice.zecPrice}
                          amtZec={
                            Utils.parseStringLocaleToNumberFloat(amountText) ||
                            0
                          }
                          currency={currency}
                          privacy={privacy}
                        />
                      ) : (
                        <ZecAmount
                          style={{ marginLeft: 0 }}
                          currencyName={info.currencyName}
                          color={colors.text}
                          size={20}
                          amtZec={
                            Utils.parseStringLocaleToNumberFloat(amountText) ||
                            0
                          }
                          privacy={privacy}
                        />
                      )}
                      <View style={{ marginLeft: inputZec ? 5 : 2 }}>
                        <PriceFetcher setZecPrice={setZecPrice} />
                      </View>
                    </>
                  )}
                </View>

                <View style={{ display: 'flex', flexDirection: 'column' }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (
                        spendableBalanceLastError &&
                        mode === ModeEnum.advanced
                      ) {
                        Alert.alert(
                          translate('send.spendable') as string,
                          spendableBalanceLastError,
                          [
                            {
                              text: translate('support') as string,
                              onPress: async () =>
                                sendEmail(
                                  translate,
                                  zingolibVersion,
                                  translate('send.spendable') as string,
                                  spendableBalanceLastError,
                                ),
                            },
                            {
                              text: translate('cancel') as string,
                              style: 'cancel',
                            },
                          ],
                          { cancelable: false },
                        );
                      }
                    }}
                  >
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        marginTop: 0,
                      }}
                    >
                      <RegText
                        style={{
                          fontSize: 14,
                          color:
                            spendableBalanceLastError &&
                            mode === ModeEnum.advanced
                              ? 'red'
                              : colors.text,
                        }}
                      >
                        {translate('send.spendable') as string}
                      </RegText>
                      {inputZec ? (
                        <ZecAmount
                          style={{ marginLeft: 0 }}
                          currencyName={info.currencyName}
                          color={
                            stillConfirming ||
                            negativeMaxAmount ||
                            (spendableBalanceLastError &&
                              mode === ModeEnum.advanced)
                              ? 'red'
                              : colors.text
                          }
                          size={15}
                          amtZec={maxAmount}
                          privacy={privacy}
                        />
                      ) : (
                        <CurrencyAmount
                          style={{ fontSize: 15 }}
                          price={zecPrice.zecPrice}
                          amtZec={maxAmount}
                          currency={currency}
                          privacy={privacy}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                  {donation &&
                    server.chainName === ChainNameEnum.mainChainName &&
                    !donationAddress && (
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          marginTop: 0,
                          backgroundColor: colors.card,
                          padding: 5,
                          borderRadius: 10,
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          size={20}
                          color={colors.primary}
                          style={{ marginRight: 5 }}
                        />
                        <FadeText>{'( '}</FadeText>
                        <FadeText>
                          {(translate('send.confirm-donation') as string) +
                            ': ' +
                            Utils.getZenniesDonationAmount() +
                            ' '}
                        </FadeText>
                        <FadeText>{')'}</FadeText>
                      </View>
                    )}
                  {validAddress !== 0 &&
                    validAmount !== 0 &&
                    (fee > 0 || !!proposeSendLastError) && (
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          marginTop: 0,
                          backgroundColor: colors.card,
                          padding: 5,
                          borderRadius: 10,
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          size={20}
                          color={colors.primary}
                          style={{ marginRight: 5 }}
                        />
                        <FadeText>{'( '}</FadeText>
                        <TouchableOpacity
                          onPress={() => {
                            if (
                              proposeSendLastError &&
                              mode === ModeEnum.advanced
                            ) {
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
                                  {
                                    text: translate('cancel') as string,
                                    style: 'cancel',
                                  },
                                ],
                                { cancelable: false },
                              );
                            }
                          }}
                        >
                          <FadeText
                            style={{
                              color:
                                proposeSendLastError &&
                                mode === ModeEnum.advanced
                                  ? 'red'
                                  : colors.text,
                            }}
                          >
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
                    <TouchableOpacity
                      onPress={() => {
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
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          size={20}
                          color={colors.primary}
                          style={{ marginRight: 5 }}
                        />
                        <FadeText style={{ fontSize: 12.5 }}>
                          {translate('send.somefunds') as string}
                        </FadeText>
                      </View>
                    </TouchableOpacity>
                  )}
                  {showShieldInfo && mode === ModeEnum.advanced && (
                    <TouchableOpacity
                      onPress={() => {
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
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          size={20}
                          color={colors.primary}
                          style={{ marginRight: 5 }}
                        />
                        <FadeText>
                          {translate('send.needtoshield') as string}
                        </FadeText>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {memoEnabled === true && (
                <>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <FadeText style={{ marginTop: 3, marginBottom: 5 }}>
                      {translate('send.memo') as string}
                    </FadeText>
                  </View>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'flex-start',
                    }}
                  >
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
                      }}
                    >
                      <TextInput
                        testID="send.memo-field"
                        placeholder={
                          translate('messages.message-placeholder') as string
                        }
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
                          updateToField(
                            null,
                            !amountText && !!text ? '0' : null,
                            null,
                            text,
                            null,
                          );
                        }}
                        onEndEditing={(
                          e: NativeSyntheticEvent<TextInputEndEditingEventData>,
                        ) => {
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
                        onContentSizeChange={(
                          e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
                        ) => {
                          if (
                            e.nativeEvent.contentSize.height >
                              (Platform.OS === GlobalConst.platformOSandroid
                                ? 70
                                : 35) &&
                            !memoIcon
                          ) {
                            setMemoIcon(true);
                            scrollToEnd();
                          }
                          if (
                            e.nativeEvent.contentSize.height <=
                              (Platform.OS === GlobalConst.platformOSandroid
                                ? 70
                                : 35) &&
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
                            }, 1 * 1000);
                          }
                        }}
                      />
                      {memoText && (
                        <TouchableOpacity
                          onPress={() => {
                            updateToField(null, null, null, '', null);
                          }}
                        >
                          <FontAwesomeIcon
                            style={{
                              marginTop: 7,
                              marginRight: memoIcon ? 0 : 7,
                            }}
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
                          }}
                        >
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
                      }}
                    >
                      <FadeText
                        style={{
                          marginTop: 0,
                          fontWeight: 'bold',
                          fontSize: 12.5,
                          color: 'red',
                        }}
                      >{`${Utils.countMemoBytes(memoText, includeUAMemoBoolean, defaultUnifiedAddress)} `}</FadeText>
                      <FadeText style={{ marginTop: 0, fontSize: 12.5 }}>
                        {translate('loadedapp.of') as string}
                      </FadeText>
                      <FadeText style={{ marginTop: 0, fontSize: 12.5 }}>
                        {' ' + GlobalConst.memoMaxLength.toString() + ' '}
                      </FadeText>
                    </View>
                  )}
                </>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setNym(!nym)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginHorizontal: 20,
                marginTop: 15,
                marginBottom: 20,
              }}
            >
              {nym ? (
                <NymOn width={22} height={22} />
              ) : (
                <NymOff width={22} height={22} />
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <BoldText style={{ color: nym ? '#07FF94' : colors.text }}>
                  {translate('settings.nym-network') as string}
                </BoldText>
                <FadeText>
                  {translate('settings.nym-enhanced-privacy') as string}
                </FadeText>
              </View>
              {nym ? (
                <SwitchOn width={40} height={19} />
              ) : (
                <SwitchOff width={40} height={19} />
              )}
            </TouchableOpacity>

            <View
              style={{
                flexGrow: 1,
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                marginVertical: 0,
              }}
            >
              <View
                style={{
                  flexGrow: 1,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <Button
                  testID={
                    sendButtonEnabled ? 'send.button' : 'send.button-disabled'
                  }
                  accessible={true}
                  accessibilityLabel={'title ' + translate('send.button')}
                  type={nym ? ButtonTypeEnum.Nym : ButtonTypeEnum.Primary}
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
                      server.chainName === ChainNameEnum.mainChainName &&
                      donationAddress &&
                      Utils.parseStringLocaleToNumberFloat(amountText) <
                        Utils.parseStringLocaleToNumberFloat(
                          Utils.getZenniesDonationAmount(),
                        )
                    ) {
                      addLastSnackbar(
                        `${translate('send.donation-minimum-message') as string}`,
                      );
                      updateToField(
                        null,
                        Utils.getZenniesDonationAmount(),
                        null,
                        null,
                        false,
                      );
                      return;
                    }
                    if (
                      !netInfo.isConnected ||
                      selectServer === SelectServerEnum.offline
                    ) {
                      addLastSnackbar(
                        translate('loadedapp.connection-error') as string,
                      );
                      return;
                    }
                    if (
                      validAmount === 1 &&
                      amountText &&
                      mode !== ModeEnum.basic &&
                      Utils.parseStringLocaleToNumberFloat(amountText) ===
                        Utils.parseStringLocaleToNumberFloat(
                          maxAmount.toFixed(8),
                        )
                    ) {
                      addLastSnackbar(
                        `${translate('send.sendall-message') as string}`,
                      );
                    }
                    // if the address is transparent - clean the memo field Just in Case.
                    if (!memoEnabled) {
                      setMemoText('');
                      updateToField(null, null, null, '', false);
                    }
                    // calculating for Privacy Level
                    let parseAddressInfoJSON: RPCParseAddressType;
                    const result: string =
                      await RPCModule.parseAddressInfo(addressText);
                    if (result) {
                      if (result.toLowerCase().startsWith(GlobalConst.error)) {
                        parseAddressInfoJSON = {} as RPCParseAddressType;
                      } else {
                        try {
                          parseAddressInfoJSON = await JSON.parse(result);
                        } catch (e) {
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
                />
              </View>
              {server.chainName === ChainNameEnum.mainChainName &&
                Platform.OS === GlobalConst.platformOSandroid && (
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
                        }}
                      >
                        <Text style={{ fontSize: 13, color: colors.border }}>
                          {translate('donation-legend') as string}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={async () => {
                          let update = false;
                          if (
                            addressText &&
                            addressText !==
                              (await Utils.getDonationAddress(server.chainName))
                          ) {
                            await ShowAddressAlertAsync(translate)
                              .then(async () => {
                                // fill the fields in the screen with the donation data
                                update = true;
                              })
                              .catch(() => {}); // user cancelled the alert — expected
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
                        }}
                      >
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
                          }}
                        >
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
    </View>
  );

  return returnPage;
};

export default React.memo(Send);
