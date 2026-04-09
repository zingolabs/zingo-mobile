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
  Alert,
  NativeSyntheticEvent,
  TextInputEndEditingEventData,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import {
  faQrcode,
  faCheck,
  faArrowDown,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useNavigation, useTheme } from '@react-navigation/native';
import { getNumberFormatSettings } from 'react-native-localize';

import FadeText from '../Components/FadeText';
import ErrorText from '../Components/ErrorText';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import {
  SendPageStateClass,
  ToAddrClass,
  ChainNameEnum,
  GlobalConst,
  ServerType,
  SelectServerEnum,
  RouteEnum,
  SecurityType,
  ScreenEnum,
} from '../../app/AppState';
import { parseZcashURI } from '../../app/uris';
import RPCModule from '../../app/RPCModule';
import Utils from '../../app/utils';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { createAlert } from '../../app/createAlert';
import { RPCSendProposeType } from '../../app/rpc/types/RPCSendProposeType';
import { RPCSpendablebalanceType } from '../../app/rpc/types/RPCSpendablebalanceType';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../Components/Snackbars';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Wallet from '../../assets/icons/wallet.svg';
import { HeaderTitle } from '../Header';
import { XIcon } from '../Components/Icons/XIcon';
import LiquidPrimaryButton from '../Components/LiquidButton/LiquidPrimaryButton';

type SendProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Send> & {
  toggleMenuDrawer: () => void;
  setShieldingAmount: (value: number) => void;
  setScrollToTop: (value: boolean) => void;
  setScrollToBottom: (value: boolean) => void;
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

type SpendabilityState = {
  spendable: number;
  maxAmount: number;
  loading: boolean;
  error: string;
};

const Send: React.FunctionComponent<SendProps> = ({
  sendTransaction,
  clearToAddr,
  setScrollToTop,
  setScrollToBottom,
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
    somePending,
    donation,
    addresses,
    defaultUnifiedAddress,
    shieldingAmount,
    selectIndexerServer,
    zenniesDonationAddress,
    snackbars,
    removeFirstSnackbar,
  } = context;

  const { colors } = useTheme() as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Send;
  const insets = useSafeAreaInsets();
  const { decimalSeparator } = getNumberFormatSettings();
  const maxW = 520;

  const [memoEnabled, setMemoEnabled] = useState<boolean>(false);
  const [validAddress, setValidAddress] = useState<number>(0);
  const [validAmount, setValidAmount] = useState<number>(0);
  const [validMemo, setValidMemo] = useState<number>(0);
  const [sendButtonEnabled, setSendButtonEnabled] = useState<boolean>(false);
  const [fee, setFee] = useState<number>(0);
  const [stillConfirming, setStillConfirming] = useState<boolean>(false);
  const [donationAddress, setDonationAddress] = useState<boolean>(false);
  const [proposeSendLastError, setProposeSendLastError] = useState<string>('');
  const [negativeMaxAmount, setNegativeMaxAmount] = useState<boolean>(false);
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
  const [title, setTitle] = useState<'Send to' | 'Send'>('Send to');
  const [kbOpen, setKbOpen] = React.useState(false);

  const spendableReqIdRef = useRef(0);
  const feeReqIdRef = useRef(0);

  const getBaseSpendable = useCallback((): number => {
    return totalBalance ? totalBalance.totalSpendableBalance : 0;
  }, [totalBalance]);

  const getBaseMaxAmount = useCallback((): number => {
    const baseSpendable = getBaseSpendable();
    const donationAdjustment =
      donation &&
      indexerServer.chainName === ChainNameEnum.mainChainName &&
      !donationAddress
        ? Utils.parseStringLocaleToNumberFloat(Utils.getZenniesDonationAmount())
        : 0;

    const nextMax = baseSpendable - donationAdjustment;
    return nextMax > 0 ? nextMax : 0;
  }, [donation, donationAddress, getBaseSpendable, indexerServer.chainName]);

  const [sendability, setSendability] = useState<SpendabilityState>({
    spendable: getBaseSpendable(),
    maxAmount: getBaseMaxAmount(),
    loading: false,
    error: '',
  });

  const syncSendabilityFromGlobal = useCallback(() => {
    const spendable = getBaseSpendable();
    const maxAmount = getBaseMaxAmount();

    setSendability({
      spendable,
      maxAmount,
      loading: false,
      error: '',
    });
    setNegativeMaxAmount(maxAmount <= 0);
  }, [getBaseMaxAmount, getBaseSpendable]);

  const defaultValueFee = useCallback((): void => {
    setFee(0);
    setProposeSendLastError('');
  }, []);

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

  const calculateFeeWithPropose = useCallback(
    async (
      amountPar: string,
      addressPar: string,
      memoPar: string,
      includeUAMemoPar: boolean,
      addressIsValid: boolean,
      memoIsValid: boolean,
    ): Promise<void> => {
      const reqId = ++feeReqIdRef.current;

      if (!addressPar || !addressIsValid) {
        if (reqId === feeReqIdRef.current) {
          defaultValueFee();
        }
        return;
      }

      if (amountPar === '') {
        if (reqId === feeReqIdRef.current) {
          defaultValueFee();
        }
        return;
      }

      const parsedAmount = Utils.parseStringLocaleToNumberFloat(amountPar);
      if (isNaN(parsedAmount)) {
        if (reqId === feeReqIdRef.current) {
          defaultValueFee();
        }
        return;
      }

      if (!memoIsValid) {
        if (reqId === feeReqIdRef.current) {
          defaultValueFee();
        }
        return;
      }

      const sendPageStateCalculateFee = new SendPageStateClass(
        new ToAddrClass(0),
      );
      sendPageStateCalculateFee.toaddr.to = addressPar;
      sendPageStateCalculateFee.toaddr.memo = memoPar;
      sendPageStateCalculateFee.toaddr.includeUAMemo = includeUAMemoPar;
      sendPageStateCalculateFee.toaddr.amount = amountPar;

      const sendJson = await Utils.getSendManyJSON(
        sendPageStateCalculateFee,
        defaultUnifiedAddress,
        indexerServer,
        donation,
      );

      const runProposeStr = await runSendPropose(JSON.stringify(sendJson));

      if (reqId !== feeReqIdRef.current) {
        return;
      }

      if (
        runProposeStr &&
        runProposeStr.toLowerCase().startsWith(GlobalConst.error)
      ) {
        setProposeSendLastError(runProposeStr);
        setFee(0);
        return;
      }

      try {
        const runProposeJson: RPCSendProposeType = JSON.parse(runProposeStr);

        if (runProposeJson.error) {
          setProposeSendLastError(runProposeJson.error);
          setFee(0);
          return;
        }

        setProposeSendLastError('');
        setFee(
          runProposeJson.fee !== undefined ? runProposeJson.fee / 10 ** 8 : 0,
        );

        if (runProposeJson.amount !== undefined) {
          const newAmount =
            runProposeJson.amount / 10 ** 8 -
            (donation &&
            indexerServer.chainName === ChainNameEnum.mainChainName &&
            !donationAddress
              ? Utils.parseStringLocaleToNumberFloat(
                  Utils.getZenniesDonationAmount(),
                )
              : 0);

          updateToField(
            null,
            Utils.parseNumberFloatToStringLocale(newAmount, 8),
            null,
            null,
            null,
          );
        }
      } catch {
        setProposeSendLastError(runProposeStr);
        setFee(0);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      defaultUnifiedAddress,
      defaultValueFee,
      donation,
      donationAddress,
      indexerServer,
    ],
  );

  const calculateSpendableBalance = useCallback(
    async (addressPar: string, addressIsValid: boolean): Promise<void> => {
      const reqId = ++spendableReqIdRef.current;

      if (!addressPar || !addressIsValid) {
        if (reqId === spendableReqIdRef.current) {
          syncSendabilityFromGlobal();
        }
        return;
      }

      setSendability(prev => ({
        ...prev,
        loading: true,
        error: '',
      }));

      let spendable = getBaseSpendable();
      const zenniesForZingo = donationAddress ? false : donation;

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

      if (reqId !== spendableReqIdRef.current) {
        return;
      }

      if (
        runSpendableBalanceStr &&
        runSpendableBalanceStr.toLowerCase().startsWith(GlobalConst.error)
      ) {
        setSendability(prev => ({
          ...prev,
          loading: false,
          error: runSpendableBalanceStr,
        }));
        return;
      }

      try {
        const runSpendableBalanceJson: RPCSpendablebalanceType = JSON.parse(
          runSpendableBalanceStr,
        );

        if (runSpendableBalanceJson.spendable_balance !== undefined) {
          spendable = runSpendableBalanceJson.spendable_balance / 10 ** 8;
        }

        const maxAmount = spendable > 0 ? spendable : 0;

        setSendability({
          spendable,
          maxAmount,
          loading: false,
          error: '',
        });
        setNegativeMaxAmount(maxAmount <= 0);
      } catch (e) {
        setSendability(prev => ({
          ...prev,
          loading: false,
          error: `${runSpendableBalanceStr} ${
            e instanceof Error ? e.message : String(e)
          }`,
        }));
      }
    },
    [donation, donationAddress, getBaseSpendable, syncSendabilityFromGlobal],
  );

  const updateToField = async (
    addressPar: string | null,
    amountPar: string | null,
    amountCurrencyPar: string | null,
    memoPar: string | null,
    includeUAMemoPar: boolean | null,
  ) => {
    if (addressPar !== null) {
      if (
        addressPar.toLowerCase().startsWith(GlobalConst.zcash) ||
        addressPar.toLowerCase().includes(':')
      ) {
        const { error, target } = await parseZcashURI(
          addressPar,
          translate,
          indexerServer,
        );

        if (target) {
          [target].forEach(tgt => {
            setAddressText(tgt.address || '');
            setAmountText(
              tgt.amount
                ? Utils.parseNumberFloatToStringLocale(tgt.amount, 8)
                : '',
            );
            setMemoText(tgt.memoString || '');
          });
        }

        if (error) {
          addLastSnackbar({ message: error, screenName: [screenName] });
        }
      } else {
        setAddressText(addressPar.replace(/[ \t\n\r]+/g, ''));
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
    if (!addressText || validAddress !== 1) {
      setTitle('Send to');
    }
  }, [addressText, validAddress]);

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  useEffect(() => {
    syncSendabilityFromGlobal();
  }, [syncSendabilityFromGlobal]);

  useEffect(() => {
    const stillConf =
      (totalBalance ? totalBalance.totalOrchardBalance : 0) !==
        (totalBalance ? totalBalance.confirmedOrchardBalance : 0) ||
      (totalBalance ? totalBalance.totalSaplingBalance : 0) !==
        (totalBalance ? totalBalance.confirmedSaplingBalance : 0) ||
      somePending;
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
    const parseAddress = async (
      address: string,
      serverChainName: string,
    ): Promise<{ isValid: boolean; onlyOrchardUA: string }> => {
      return await Utils.isValidAddress(address, serverChainName);
    };

    if (addressText) {
      parseAddress(addressText, indexerServer.chainName).then(r => {
        setValidAddress(r.isValid ? 1 : -1);
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
      setValidMemo(len > GlobalConst.memoMaxLength ? -1 : 1);
    } else {
      setValidMemo(0);
    }

    let invalid = false;
    if (amountCurrencyText !== '') {
      if (isNaN(Utils.parseStringLocaleToNumberFloat(amountCurrencyText))) {
        setValidAmount(-1);
        invalid = true;
      }
    }

    if (!invalid) {
      if (amountText !== '') {
        if (isNaN(Utils.parseStringLocaleToNumberFloat(amountText))) {
          setValidAmount(-1);
        } else {
          if (
            Utils.parseStringLocaleToNumberFloat(amountText) >= 0 &&
            Utils.parseStringLocaleToNumberFloat(amountText) <=
              Utils.parseStringLocaleToNumberFloat(
                sendability.maxAmount.toFixed(8),
              )
          ) {
            setValidAmount(1);
          } else {
            setValidAmount(-2);
          }
        }
      } else {
        setValidAmount(0);
      }
    }
  }, [
    decimalSeparator,
    indexerServer.chainName,
    addressText,
    amountCurrencyText,
    amountText,
    memoText,
    includeUAMemoBoolean,
    defaultUnifiedAddress,
    sendability.maxAmount,
  ]);

  useEffect(() => {
    calculateFeeWithPropose(
      amountText,
      addressText,
      memoText,
      includeUAMemoBoolean,
      validAddress === 1,
      validMemo !== -1,
    );
  }, [
    amountText,
    addressText,
    memoText,
    includeUAMemoBoolean,
    validAddress,
    validMemo,
    calculateFeeWithPropose,
  ]);

  useEffect(() => {
    if (!addressText.toLowerCase().startsWith(GlobalConst.zcash)) {
      calculateSpendableBalance(addressText, validAddress === 1);
    }
  }, [calculateSpendableBalance, addressText, validAddress]);

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
    setSendButtonEnabled(
      validAddress === 1 &&
        validAmount === 1 &&
        validMemo !== -1 &&
        fee > 0 &&
        sendability.maxAmount > 0 &&
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
    sendability.maxAmount,
  ]);

  useEffect(() => {
    if (addressText) {
      (async () => {
        const donationA =
          addressText ===
            (await Utils.getDonationAddress(indexerServer.chainName)) ||
          addressText === zenniesDonationAddress ||
          addressText ===
            (await Utils.getNymDonationAddress(indexerServer.chainName));
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
    syncSendabilityFromGlobal();
  };

  const buildSendState = () =>
    ({
      toaddr: {
        to: addressText,
        amount: amountText,
        amountCurrency: amountCurrencyText,
        memo: memoText,
        includeUAMemo: includeUAMemoBoolean,
      },
    }) as SendPageStateClass;

  const interceptCustomError = (error: string) => {
    if (
      error.includes('18: bad-txns-sapling-duplicate-nullifier') ||
      error.includes('18: bad-txns-sprout-duplicate-nullifier') ||
      error.includes('18: bad-txns-orchard-duplicate-nullifier')
    ) {
      return translate('send.duplicate-nullifier-error') as string;
    } else if (error.includes('64: dust')) {
      return translate('send.dust-error') as string;
    }
  };

  const confirmSend = async (sendPageStatePar: SendPageStateClass) => {
    if (
      !netInfo.isConnected ||
      selectIndexerServer === SelectServerEnum.offline
    ) {
      addLastSnackbar({
        message: translate('loadedapp.connection-error') as string,
        screenName: [screenName],
      });
      return;
    }

    navigation.navigate(RouteEnum.Computing, { sendPageStatePar });

    let error = '';
    let customError: string | undefined;

    try {
      const txid = await sendTransaction(sendPageStatePar);

      clearState();
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

      navigation.navigate(RouteEnum.ComputingOK, { txid });
      return;
    } catch (err) {
      error = err as string;
      customError = interceptCustomError(error);
    }

    navigation.navigate(RouteEnum.ComputingError, {
      error: `${customError ? customError : error}`,
    });
  };

  const setQrcodeModalShow = () => {
    navigation.navigate(RouteEnum.ScannerAddress, {
      setAddress: (a: string) => updateToField(a, null, null, null, null),
      active: true,
    });
  };

  const setConfirmModalShow = async () => {
    await confirmSend(buildSendState());
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? insets.top : kbOpen ? insets.top : 0
        }
      >
        <HeaderTitle
          title={title}
          goBack={() => {
            if (title === 'Send') {
              setTitle('Send to');
            } else {
              clear();
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }
          }}
        />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 16,
          }}
        >
          <View style={{ flexGrow: 1, alignItems: 'center' }}>
            {title === 'Send to' && (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    width: '100%',
                    marginBottom: 5,
                  }}
                >
                  {validAddress === 1 && (
                    <View testID="send.address.check">
                      <FontAwesomeIcon
                        icon={faCheck}
                        color={colors.primary}
                        style={{ marginHorizontal: 10 }}
                      />
                    </View>
                  )}
                  {validAddress === -1 && (
                    <ErrorText
                      testID="send.address.error"
                      style={{ marginHorizontal: 10 }}
                    >
                      {translate('send.invalidaddress') as string}
                    </ErrorText>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    borderColor: 'transparent',
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
                  }}
                >
                  <TextInput
                    placeholder="Enter address"
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
                      }}
                    >
                      <View
                        style={{
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: colors.zingo,
                          borderRadius: 11,
                          height: 22,
                          width: 22,
                          padding: 0,
                        }}
                      >
                        <XIcon
                          color={colors.background}
                          width={20}
                          height={20}
                        />
                      </View>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    testID="send.scan-button"
                    accessible={true}
                    accessibilityLabel={translate('send.scan-acc') as string}
                    onPress={setQrcodeModalShow}
                  >
                    <FontAwesomeIcon
                      style={{ marginLeft: 10 }}
                      size={22}
                      icon={faQrcode}
                      color={colors.placeholder}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {title === 'Send' && (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    width: '100%',
                    marginBottom: 5,
                  }}
                >
                  {validAmount === -1 && (
                    <ErrorText style={{ marginHorizontal: 10 }}>
                      {translate('send.invalidnumber') as string}
                    </ErrorText>
                  )}
                  {validAmount === -2 && (
                    <ErrorText style={{ marginHorizontal: 10 }}>
                      {translate('send.invalidamount') as string}
                    </ErrorText>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: 'column',
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
                    paddingHorizontal: 20,
                    paddingVertical: 30,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput
                      placeholder={'0'}
                      placeholderTextColor={colors.placeholder}
                      style={{
                        flexGrow: 1,
                        flexShrink: 1,
                        color: colors.text,
                        fontWeight: '600',
                        fontSize: 45,
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
                      onEndEditing={(
                        e: NativeSyntheticEvent<TextInputEndEditingEventData>,
                      ) => {
                        updateToField(
                          null,
                          e.nativeEvent.text.substring(0, 20),
                          null,
                          null,
                          null,
                        );
                      }}
                      editable={true}
                      maxLength={20}
                      keyboardType="numeric"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                    />

                    <View
                      style={{
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <View
                        style={{ flexDirection: 'row', alignSelf: 'flex-end' }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            borderColor: colors.text,
                            borderWidth: 1,
                            borderRadius: 20,
                            backgroundColor: colors.background,
                            paddingHorizontal: 10,
                            paddingVertical: 10,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Image
                            source={require('../../assets/icons/zcash.png')}
                            style={{ width: 22, height: 22 }}
                          />
                          <RegText style={{ fontSize: 15 }}>
                            {' ' +
                              (info.currencyName ? info.currencyName : '---')}
                          </RegText>
                        </View>
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'baseline',
                          justifyContent: 'flex-end',
                          marginTop: 5,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => {
                            if (sendability.error) {
                              Alert.alert(
                                'Available',
                                sendability.error,
                                [
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
                            <ZecAmount
                              currencyName={info.currencyName}
                              color={
                                stillConfirming ||
                                negativeMaxAmount ||
                                !!sendability.error
                                  ? 'red'
                                  : colors.text
                              }
                              size={15}
                              amtZec={sendability.maxAmount}
                              privacy={privacy}
                              style={{ fontWeight: '900' }}
                            />
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            updateToField(
                              null,
                              Utils.parseNumberFloatToStringLocale(
                                sendability.maxAmount,
                                5,
                              ),
                              null,
                              null,
                              null,
                            );
                          }}
                        >
                          <View
                            style={{
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              borderRadius: 10,
                              margin: 0,
                              paddingHorizontal: 8,
                              paddingVertical: 5,
                              backgroundColor: colors.background,
                            }}
                          >
                            <RegText
                              style={{ fontSize: 14 }}
                              color={colors.text}
                            >
                              {'Max.'}
                            </RegText>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'column' }}>
                    {validAddress !== 0 &&
                      validAmount !== 0 &&
                      (fee > 0 || !!proposeSendLastError) && (
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            marginTop: 0,
                            backgroundColor: colors.secondary,
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
                              if (proposeSendLastError) {
                                Alert.alert(
                                  translate('send.fee') as string,
                                  proposeSendLastError,
                                  [
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
                                color: proposeSendLastError
                                  ? 'red'
                                  : colors.money,
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
                            backgroundColor: colors.secondary,
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
                  </View>
                </View>

                <View
                  style={{
                    padding: 10,
                    paddingHorizontal: 12,
                    borderColor: colors.text,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderRadius: 30,
                    marginTop: -25,
                    zIndex: 999,
                  }}
                >
                  <FontAwesomeIcon
                    icon={faArrowDown}
                    size={25}
                    color={colors.text}
                  />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 25,
                    marginBottom: 10,
                    backgroundColor: colors.background,
                    width: '100%',
                    maxWidth: maxW,
                    minWidth: '50%',
                    minHeight: 48,
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 30,
                    gap: 10,
                    marginTop: -15,
                  }}
                >
                  <Wallet width={40} height={40} />
                  <RegText>{Utils.trimToSmall(addressText, 10)}</RegText>
                </View>
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
            paddingHorizontal: 20,
          }}
        >
          {title === 'Send to' && (
            <LiquidPrimaryButton
              style={{
                width: '100%',
              }}
              title={'Continue'}
              disabled={!addressText || validAddress !== 1}
              onPress={() => {
                setTitle('Send');
                Keyboard.dismiss();
              }}
            />
          )}

          {title === 'Send' && (
            <LiquidPrimaryButton
              style={{
                width: '100%',
              }}
              title={
                validAmount === 1 &&
                amountText &&
                Utils.parseStringLocaleToNumberFloat(amountText) ===
                  Utils.parseStringLocaleToNumberFloat(
                    sendability.maxAmount.toFixed(8),
                  )
                  ? (translate('send.button-all') as string)
                  : (translate('send.button') as string)
              }
              disabled={!sendButtonEnabled}
              onPress={async () => {
                setSendButtonEnabled(false);
                updateToField(null, null, null, memoText, null);

                if (
                  indexerServer.chainName === ChainNameEnum.mainChainName &&
                  donationAddress &&
                  Utils.parseStringLocaleToNumberFloat(amountText) <
                    Utils.parseStringLocaleToNumberFloat(
                      Utils.getZenniesDonationAmount(),
                    )
                ) {
                  addLastSnackbar({
                    message: `${translate('send.donation-minimum-message') as string}`,
                    screenName: [screenName],
                  });
                  updateToField(
                    null,
                    Utils.getZenniesDonationAmount(),
                    null,
                    null,
                    false,
                  );
                  setSendButtonEnabled(true);
                  return;
                }

                if (
                  !netInfo.isConnected ||
                  selectIndexerServer === SelectServerEnum.offline
                ) {
                  addLastSnackbar({
                    message: translate('loadedapp.connection-error') as string,
                    screenName: [screenName],
                  });
                  setSendButtonEnabled(true);
                  return;
                }

                if (
                  validAmount === 1 &&
                  amountText &&
                  Utils.parseStringLocaleToNumberFloat(amountText) ===
                    Utils.parseStringLocaleToNumberFloat(
                      sendability.maxAmount.toFixed(8),
                    )
                ) {
                  addLastSnackbar({
                    message: `${translate('send.sendall-message') as string}`,
                    screenName: [screenName],
                  });
                }

                if (!memoEnabled) {
                  setMemoText('');
                  updateToField(null, null, null, '', false);
                }

                setConfirmModalShow();
                Keyboard.dismiss();
                setSendButtonEnabled(true);
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default Send;
