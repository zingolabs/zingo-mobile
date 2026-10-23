/* eslint-disable react-native/no-inline-styles */
import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  ScrollView,
  Keyboard,
  TextInput,
  TouchableOpacity,
  Platform,
  Pressable,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputEndEditingEventData,
  TextInputContentSizeChangeEventData,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { useTheme, space20, slopFor } from '@app/theme';
import { getNumberFormatSettings } from 'react-native-localize';

import BoldText from '@ui/primitives/BoldText';
import {
  sendGateOpen,
  shownStatusKey,
} from '@app/walletBackend/transforms/mixnetView';
import Button from '@ui/primitives/Button';
import AppSheet from '@ui/primitives/AppSheet';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import {
  SendPageStateClass,
  ToAddrClass,
  GlobalConst,
  SelectServerEnum,
  Route,
  ProposalPoolsType,
} from '@app/AppState';
import { hasUnconfirmedFunds } from '@app/AppState/classes/TotalBalanceClass';
// Imported straight from the module rather than through the `uris` barrel, so
// the ZNS SDK stays out of the module graph of everything else that barrel
// serves (the wallet backend among them).
import { isZnsAlias, resolveZnsName } from '@app/uris/resolveZnsName';
import {
  getSpendableBalanceWithAddress,
  sendAllPropose,
  sendPropose,
} from '@app/walletBackend';
import {
  computingEnd,
  settleSend,
} from '@app/walletBackend/transforms/sendSettlement';
import Utils from '@app/utils';
/** After utils: the uris barrel and utils import each other, and this order resolves it. */
import { parseZcashURI } from '@app/uris';
import { useResult } from '@app/navigation/results';
import {
  fiatEligible,
  fiatQuote,
  toFiatText,
  toZecText,
} from '@app/price/fiatQuote';
import { safeSnapToIndex } from '@app/utils/safeSnapToIndex';
import { HomeTabScreenProps, WalletNavigation } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import Header from '@ui/widgets/Header';
import BottomSheet, { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import { useDismissSheetsOnBlur } from '@app/hooks/useDismissSheetsOnBlur';
import { useOptionsPanelSheetSlide } from '@app/hooks/useOptionsPanelSheetSlide';
import { usePriceSnapAutoClose } from '@app/hooks/usePriceSnapAutoClose';
import { RPCSendProposeType } from '@app/walletBackend/types/RPCSendProposeType';
import ShowAddressAlertAsync from '@app/services/showAddressAlertAsync';
import Memo from './components/Memo';
import RecipientField from './components/RecipientField';
import type { NameLookup } from './components/RecipientField';
import AmountCard from './components/AmountCard';
import Text from '@ui/primitives/Text';
import { PlusIcon } from '@ui/primitives/Icons/PlusIcon';
import SendErrorSheet from './components/SendErrorSheet';
import { sendEmail } from '@app/services/sendEmail';
import { retryServer } from '@app/services/retryServer';
import { RPCSpendablebalanceType } from '@app/walletBackend/types/RPCSpendablebalanceType';
import { fieldBorder } from '@ui/primitives/fieldBorder';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';
import { ZoomInIcon } from '@ui/primitives/Icons/ZoomInIcon';

type SendProps = HomeTabScreenProps<'Send'>;

/** How long a typed name sits still before it is looked up. */
const NAME_LOOKUP_MS = 700;
/** Text that starts like a Zcash address or URI, never a name. */
const ADDRESS_LIKE =
  /^(u1|utest1|uregtest1|zs1|ztestsapling|zregtestsapling|t1|t3|tm|tex|zcash:)/i;
/** A name the protocol allows, typed without its suffix. */
const BARE_NAME = /^[a-z0-9]{1,62}$/;

const Send: React.FunctionComponent<SendProps> = () => {
  const navigation = useNavigation<WalletNavigation>();
  const context = useContext(ContextAppLoaded);
  const {
    sendTransaction,
    clearToAddr,
    setScrollToTop,
    setScrollToBottom,
    setServerOption,
    setShieldingAmount,
    translate,
    info,
    totalBalance,
    sendPageState,
    zecPrice,
    netInfo,
    privacy,
    server,
    setBackgroundError,
    addLastSnackbar,
    somePending,
    addressBook,
    launchAddTagModal,
    defaultUnifiedAddress,
    shieldingAmount,
    selectServer,
    zingolibVersion,
    setPrivacyOption,
    mixnetView,
    sendPermitNow,
  } = context;
  const { colors } = useTheme();
  const showFiat = fiatEligible(server, server.chainName);
  const quote = fiatQuote(zecPrice, server, server.chainName);

  const [memoEnabled, setMemoEnabled] = useState<boolean>(false);
  const [validAddress, setValidAddress] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  // A ZNS alias the indexer does not know. Reported in place of the
  // invalid-address text, which would be wrong: the address is not malformed,
  // the name simply is not registered.
  const [nameLookup, setNameLookup] = useState<NameLookup>({ kind: 'none' });
  // The alias a resolution came from, kept beside the address it produced.
  // Resolving replaces the alias in the field with a unified address, and
  // without this the origin of that address would be lost — the user typed
  // "pepe.zcash" and would be looking at a string of base32.
  const [zns, setZns] = useState<{ alias: string; address: string } | null>(
    null,
  );
  const [validAmount, setValidAmount] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - Invalid number, -2 - Invalid Amount
  /** The field that has focus, for its blue edge. */
  const [focusedField, setFocusedField] = useState<
    'none' | 'address' | 'amount' | 'memo'
  >('none');
  const [validMemo, setValidMemo] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [sendButtonEnabled, setSendButtonEnabled] = useState<boolean>(false);
  const [memoIcon, setMemoIcon] = useState<boolean>(false);
  const [maxAmount, setMaxAmount] = useState<number>(0);
  const [spendable, setSpendable] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);
  const [proposalPools, setProposalPools] = useState<ProposalPoolsType>({
    source: [],
    destination: [],
  });
  const [stillConfirming, setStillConfirming] = useState<boolean>(false);
  const [updatingToField, setUpdatingToField] = useState<boolean>(false);
  const [negativeMaxAmount, setNegativeMaxAmount] = useState<boolean>(false);
  const [inputZec, setInputZec] = useState<boolean>(true);
  const [proposeSendLastError, setProposeSendLastError] = useState<string>('');
  const [spendableBalanceLastError, setSpendableBalanceLastError] =
    useState<string>('');
  const [keyboardVisible, setKeyboardVisible] = useState<boolean>(false);
  const [contentHeight, setContentHeight] = useState<number>(0);
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
  /** The memo field opens on "Add a memo", or by itself once it has text. */
  const [memoOpen, setMemoOpen] = useState<boolean>(false);
  /** A name typed in To, as the Zcash Name it would be: "maria" reads "maria.zec". */
  const nameQuery = (() => {
    const typed = addressText.trim().toLowerCase();
    if (!typed || ADDRESS_LIKE.test(typed)) {
      return '';
    }
    if (isZnsAlias(typed)) {
      return typed;
    }
    return BARE_NAME.test(typed) ? `${typed}.zec` : '';
  })();
  const [keyboardListenersDone, setKeyboardListenersDone] =
    useState<boolean>(false);
  // Bumped when the memo sheet is presented so the child Memo component
  // remounts with the latest memoText as its initial draft.
  const [memoSheetKey, setMemoSheetKey] = useState<number>(0);
  // measured dynamically to compute send sheet snap points
  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const [usdRowH, setUsdRowH] = useState<number>(0);
  const [priceRowH, setPriceRowH] = useState<number>(0);

  const scrollViewRef = useRef<ScrollView>(null);
  // A press on the tab while it is open scrolls the form to the top.
  useScrollToTop(scrollViewRef);
  // The user asked for the whole balance: MAX sets it, typing in the amount
  // field clears it. A send-all proposal can come back with less than the
  // figure MAX offered — the change output the send path always writes costs
  // one more ZIP 317 action — and it writes that corrected amount into the
  // field, so the intent cannot be read back from the amount alone.
  const sendAllRef = useRef<boolean>(false);
  const sendSheetRef = useRef<BottomSheet>(null);
  // Track internal snap index; when snapPoints shrinks (e.g., USD currency
  // disabled, 3 → 2 snaps), clamp the index in an effect so the sheet
  // doesn't throw "out of range" against the stale internal position.
  const internalSnapIndexRef = useRef<number>(0);
  // PriceRow-appearance bump is defined further down — it depends on
  // `sendSnapPoints`, declared later in this component.
  const prevHasPriceSnapRef = useRef<boolean>(false);
  const memoBottomSheetRef = useRef<BottomSheetModal>(null);
  const sendErrorSheetRef = useRef<BottomSheetModal>(null);

  // Fee (`sendPropose`) and/or spendable-balance RPC error → the CTA turns into
  // a tappable "calculation error" button that opens SendErrorSheet, which
  // lists BOTH errors (they are often the same failure, shown under each label
  // so that is explicit).
  const showCalcError = !!(spendableBalanceLastError || proposeSendLastError);
  // Nothing to spend or a failed read turn Available red.
  const spendableError = negativeMaxAmount || !!spendableBalanceLastError;
  const memoTooLong =
    Utils.countMemoBytes(
      memoText,
      includeUAMemoBoolean,
      defaultUnifiedAddress,
    ) > GlobalConst.memoMaxLength;
  const feeCalculationGenRef = useRef<number>(0);
  const { decimalSeparator } = getNumberFormatSettings();
  const keyboardHeight = useKeyboardHeight();
  useDismissSheetsOnBlur();
  const sheetSlideStyle = useOptionsPanelSheetSlide();

  // Top icons strip height is a code-side constant (~55 px) — same on any phone.
  const TOP_ICONS_H = 55;
  const SNAP_GAP = 4;
  // Bump applied to the snaps that sit just below a balance row (low + mid);
  // the max snap (just below the top icons strip) doesn't need it.
  const BALANCE_SNAP_BUMP = 10;

  useEffect(() => {
    if (!showFiat) {
      setUsdRowH(0);
    }
  }, [showFiat]);

  const sendSnapPoints = useMemo(() => {
    if (containerH <= 0 || headerH <= 0) {
      return showFiat ? ['85%', '89%', '93%'] : ['89%', '93%'];
    }
    const snapBase = containerH - headerH - SNAP_GAP;
    const snapPrice = Math.max(snapBase + BALANCE_SNAP_BUMP, 100);
    const snapLow = Math.max(snapBase + priceRowH + BALANCE_SNAP_BUMP, 100);
    const snapMid = Math.min(
      Math.max(snapBase + priceRowH + usdRowH + BALANCE_SNAP_BUMP, snapLow + 1),
      containerH - TOP_ICONS_H - SNAP_GAP,
    );
    const snapMax = Math.max(containerH - TOP_ICONS_H - SNAP_GAP, snapLow + 1);
    const points: number[] = [];
    if (priceRowH > 0) {
      points.push(snapPrice);
    }
    points.push(snapLow);
    if (showFiat && usdRowH > 0) {
      points.push(snapMid);
    }
    points.push(snapMax);
    return points;
  }, [showFiat, containerH, headerH, usdRowH, priceRowH]);

  const priceSnapIndex = priceRowH > 0 ? 0 : null;
  const onPriceSnapChange = usePriceSnapAutoClose(
    sendSheetRef,
    priceSnapIndex,
    1,
    sendSnapPoints.length,
  );

  useEffect(() => {
    if (internalSnapIndexRef.current >= sendSnapPoints.length) {
      safeSnapToIndex(
        sendSheetRef,
        sendSnapPoints.length - 1,
        sendSnapPoints.length,
      );
    }
  }, [sendSnapPoints]);

  // Bump the sheet up by one when the PriceRow first appears so the user
  // stays at the same visual snap (balance still showing) instead of
  // landing on the new price snap.
  //
  // `sendSnapPoints` is in the deps so the effect runs after React has
  // propagated the grown array to BottomSheet; clamp is the belt-and-braces
  // guard against any residual race that would otherwise crash with
  // "index ... out of the provided snap points range".
  useEffect(() => {
    const hasPriceSnap = priceRowH > 0;
    const justAppeared = !prevHasPriceSnapRef.current && hasPriceSnap;
    prevHasPriceSnapRef.current = hasPriceSnap;
    if (!justAppeared) return;
    safeSnapToIndex(
      sendSheetRef,
      internalSnapIndexRef.current + 1,
      sendSnapPoints.length,
    );
  }, [priceRowH, sendSnapPoints]);

  const sendHeader = (
    <View
      style={{
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ width: 28 }} />
        <BoldText
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: 28,
            textAlign: 'center',
          }}
        >
          {translate('send.title') as string}
        </BoldText>
        <View style={{ width: 28 }} />
      </View>
    </View>
  );

  const defaultValueFee = (): void => {
    setFee(0);
    setProposalPools({ source: [], destination: [] });
    setProposeSendLastError('');
  };

  // The balance poll hands over a fresh object every tick, identical numbers
  // included. Depending on the figure instead of the object keeps the
  // spendable query — a proposal, and since send-all sizing landed a costly
  // one — from running again for a balance that did not move.
  const spendableTotal = totalBalance ? totalBalance.totalSpendableBalance : 0;

  const defaultValuesSpendableMaxAmount = useCallback((): void => {
    setSpendable(spendableTotal);
    const max = spendableTotal;
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
  }, [spendableTotal]);

  // Whether this send empties the wallet: MAX was pressed, or the amount
  // typed is the maximum itself. Both travel the send-all path, so the fee
  // quoted and the transaction sent come from the same proposal.
  const isSendAllAmount = useCallback(
    (amountPar: string): boolean =>
      sendAllRef.current ||
      (maxAmount > 0 &&
        Utils.parseStringLocaleToNumberFloat(amountPar) ===
          Utils.parseStringLocaleToNumberFloat(maxAmount.toFixed(8))),
    [maxAmount],
  );

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
      if (
        Utils.parseStringLocaleToNumberFloat(amountPar) === 0 &&
        !memoEnabled
      ) {
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
      );
      // fee
      let proposeFee = 0;
      let proposePools: ProposalPoolsType = { source: [], destination: [] };
      // A MAX send is proposed as a send-all: the figure the spendable
      // balance reports is sized by zingolib's send-max proposal, which an
      // ordinary send request for the same amount can be refused for.
      const runPropose = isSendAllAmount(amountPar)
        ? await sendAllPropose(
            addressPar,
            memoEnabled
              ? Utils.buildMemo(
                  memoPar,
                  includeUAMemoPar,
                  defaultUnifiedAddress,
                )
              : '',
          )
        : await sendPropose(JSON.stringify(sendJson));

      // discard result if a newer calculation (or a clear) has superseded this one
      if (feeCalculationGenRef.current !== generation) {
        return;
      }

      if (!runPropose.ok) {
        // snack with error
        setProposeSendLastError(runPropose.error.message);
      } else {
        try {
          let runProposeJson: RPCSendProposeType;
          runProposeJson = await JSON.parse(runPropose.value);
          if (runProposeJson.error) {
            // snack with error — the error message already reaches the UI via
            // setProposeSendLastError; do not mirror to console (Audit Issue K).
            setProposeSendLastError(runProposeJson.error);
          } else {
            if (runProposeJson.fee !== undefined) {
              proposeFee = runProposeJson.fee / 10 ** 8;
              setProposeSendLastError('');
            }
            proposePools = {
              source: runProposeJson.source_pools ?? [],
              destination: runProposeJson.destination_pools ?? [],
            };
            if (runProposeJson.amount !== undefined) {
              const newAmount = runProposeJson.amount / 10 ** 8;
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
        } catch {
          // snack with error
          setProposeSendLastError(runPropose.value);
        }
      }
      setFee(proposeFee);
      setProposalPools(proposePools);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      server,
      defaultUnifiedAddress,
      validAddress,
      validAmount,
      validMemo,
      memoEnabled,
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
      let spendableBalance = spendableTotal;
      const start = Date.now();
      const runSpendableBalance =
        await getSpendableBalanceWithAddress(addressPar);
      if (Date.now() - start > 4000) {
        console.log(
          '=========================================== > spendable balance with address - ',
          Date.now() - start,
        );
      }
      if (!runSpendableBalance.ok) {
        // snack with error
        setSpendableBalanceLastError(runSpendableBalance.error.message);
      } else {
        try {
          const runSpendableBalanceJson: RPCSpendablebalanceType =
            await JSON.parse(runSpendableBalance.value);
          if (runSpendableBalanceJson.spendable_balance !== undefined) {
            // Audit Issue K — do not log the spendable balance value.
            spendableBalance =
              runSpendableBalanceJson.spendable_balance / 10 ** 8;
            setSpendableBalanceLastError('');
          }
        } catch (e) {
          // snack with error
          setSpendableBalanceLastError(
            runSpendableBalance.value +
              ' ' +
              (e instanceof Error ? e.message : String(e)),
          );
        }
      }

      setSpendable(spendableBalance);
      // max amount
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
    [defaultValuesSpendableMaxAmount, spendableTotal, validAddress],
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
        const parsed = await parseZcashURI(addressPar, server);

        // Audit Issue H — surface the parser error and abort before any
        // Send-state mutation. A failure result carries no target, so a
        // malformed URI cannot reach the state updates below.
        if (parsed.kind === 'error') {
          addLastSnackbar(Utils.renderErrorKeyed(parsed, translate));
          return;
        }

        const target = parsed.target;
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
      } else {
        setAddressText(addressPar.replace(/[ \t\n\r]+/g, '')); // Remove spaces
      }
    }

    if (amountPar !== null) {
      const amountTemp = amountPar.substring(0, 20);
      setAmountCurrencyText(toFiatText(amountTemp, zecPrice.zecPrice));
      setAmountText(amountTemp);
    }

    if (amountCurrencyPar !== null) {
      const amountCurrencyTemp = amountCurrencyPar.substring(0, 15);
      setAmountText(toZecText(amountCurrencyTemp, zecPrice.zecPrice));
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
      (!!totalBalance && hasUnconfirmedFunds(totalBalance)) || somePending;
    //const showUpgrade =
    //  (somePending ? 0 : totalBalance.transparentBal) === 0 && totalBalance.spendablePrivate > fee;
    setStillConfirming(stillConf);
  }, [shieldingAmount, somePending, totalBalance]);

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

  // Zcash Name Service: a name in the recipient field ("maria" or
  // "maria.zec") is looked up after a pause and shown in the results box
  // under the field; it goes into the field only when the user picks it, so
  // nothing replaces what they are still typing.
  useEffect(() => {
    if (!nameQuery) {
      setNameLookup({ kind: 'none' });
      setZns(previous =>
        previous && previous.address !== addressText ? null : previous,
      );
      return;
    }
    setValidAddress(0);
    setNameLookup({ kind: 'loading', name: nameQuery });
    let cancelled = false;
    const timerId = setTimeout(async () => {
      const resolution = await resolveZnsName(nameQuery, server.chainName);
      if (cancelled) {
        return;
      }
      setNameLookup(
        resolution.ok
          ? { kind: 'found', name: nameQuery, address: resolution.address }
          : { kind: 'missing', name: nameQuery },
      );
    }, NAME_LOOKUP_MS);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
    // addressText only matters through nameQuery, which it derives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameQuery, server.chainName]);

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
    if (addressText) {
      // A name is not an address: the lookup above owns what it shows.
      if (!nameQuery) {
        Utils.isValidAddress(addressText, server.chainName).then(r => {
          setValidAddress(r.isValid ? 1 : -1);
          if (!r.isValid) {
            setSpendableBalanceLastError('');
          }
        });
      }
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
    decimalSeparator,
    server.chainName,
    addressText,
    nameQuery,
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
        ) &&
        sendGateOpen(mixnetView),
    );
  }, [
    memoEnabled,
    amountText,
    validAddress,
    validAmount,
    validMemo,
    fee,
    maxAmount,
    mixnetView,
  ]);

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

  /** A contact or own address chosen in the book; replacing a valid address asks first. */
  const pickFromBook = async (itemValue: string) => {
    if (
      validAddress === 1 &&
      addressText &&
      itemValue &&
      addressText !== itemValue
    ) {
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
  };

  useResult('send.contact', a => pickFromBook(a));
  const openBook = () =>
    navigation.navigate(Route.AddressBook, { pick: 'send.contact' });

  const clearState = () => {
    feeCalculationGenRef.current += 1;
    sendAllRef.current = false;
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
        znsAlias: zns?.address === addressText ? zns.alias : '',
      },
    } as SendPageStateClass;
  };

  const confirmSend = async (sendPageStatePar: SendPageStateClass) => {
    const permit = sendPermitNow();
    if (permit.kind === 'error') {
      addLastSnackbar(translate(permit.errorKey) as string);
      return;
    }

    // The sending screen says how much goes and to whom: the contact, the
    // Zcash Name, or the short address.
    const to = sendPageStatePar.toaddr;
    const subject = {
      amount: Utils.parseNumberFloatToStringLocale(
        Utils.parseStringLocaleToNumberFloat(to.amount),
        4,
      ),
      who:
        addressBook.find(entry => entry.address === to.to)?.label ||
        to.znsAlias ||
        Utils.trimToSmall(to.to, 6),
    };
    navigation.navigate(Route.Computing, { subject });

    // The MAX send travels the send-all path all the way: quoted and sent by
    // the same proposal, so the amount confirmed is the amount broadcast.
    const sendAllSend = isSendAllAmount(sendPageStatePar.toaddr.amount);
    const settlement = await settleSend(
      () => sendTransaction(sendPageStatePar, sendAllSend),
      async () => {
        const target = await retryServer(server, translate);
        if (target !== server) {
          await setServerOption(target, selectServer, false, true);
        }
      },
      // A `custom` server is the user's own choice, and the retry keeps it.
      selectServer !== SelectServerEnum.custom && server.kind !== 'offline',
    );

    if (settlement.kind === 'sent') {
      clearState();
      setScrollToTop(true);
      setScrollToBottom(true);
    }
    navigation.navigate(Route.Computing, {
      ...computingEnd(settlement),
      subject,
    });
  };

  const scanButton = useRef<View>(null);

  const scrollToEnd = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: contentHeight, animated: true });
    }
  };

  // The shared scanner opens from the scan button and takes a Zcash
  // address or a zcash: URI; a bare address goes in as a URI.
  useResult('send.address', a =>
    updateToField(
      a.toLowerCase().startsWith(GlobalConst.zcash) || a.includes(':')
        ? a
        : GlobalConst.zcash + a,
      null,
      null,
      null,
      null,
    ),
  );
  // The confirmation screen, beneath which this form keeps its state, asks
  // for the proposal on entry and for the send on its button.
  useResult('send.propose', () =>
    calculateFeeWithPropose(
      amountText,
      addressText,
      memoText,
      includeUAMemoBoolean,
    ),
  );
  // The state Confirm was opened with, so the send matches what it shows.
  const confirmedState = useRef<SendPageStateClass | undefined>(undefined);
  useResult('send.confirm', () => {
    if (confirmedState.current) {
      confirmSend(confirmedState.current);
    }
  });
  const setQrcodeModalShow = () => {
    const open = (origin?: { x: number; y: number }) =>
      navigation.navigate(Route.Scanner, {
        request: 'send.address',
        accepts: { kind: 'zcash', chain: server.chainName },
        texts: {
          title: translate('scanner.title') as string,
          hint: translate('scanner.hint-address') as string,
          miss: translate('scanner.miss-address') as string,
          found: translate('scanner.found') as string,
          back: translate('scanner.back') as string,
          torch: translate('scanner.torch') as string,
        },
        origin,
      });
    if (scanButton.current) {
      scanButton.current.measureInWindow((x, y, width, height) =>
        open({ x: x + width / 2, y: y + height / 2 }),
      );
    } else {
      open();
    }
  };

  const setMemoModalShow = () => {
    // Bump key so the child Memo remounts and re-reads memoText as initial.
    setMemoSheetKey(k => k + 1);
    memoBottomSheetRef.current?.present();
  };

  const memoHeader = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ width: 48 }} />
      <BoldText
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 16,
          lineHeight: 28,
          textAlign: 'center',
        }}
      >
        {translate('send.memo') as string}
      </BoldText>
      <Pressable
        onPress={() => memoBottomSheetRef.current?.dismiss()}
        hitSlop={8}
        style={{ paddingHorizontal: 14, paddingVertical: 4 }}
      >
        <XIcon size={20} color={colors.fgMuted} />
      </Pressable>
    </View>
  );

  const setConfirmModalShow = async () => {
    const shown = buildSendState();
    confirmedState.current = shown;
    navigation.navigate(Route.Confirm, {
      calculatedFee: fee,
      proposalPools: proposalPools,
      sendAllAmount: isSendAllAmount(amountText),
      sendPageState: shown,
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

  /** The saved Zcash contact the address in To belongs to. */
  const recipientContact =
    validAddress === 1
      ? addressBook.find(
          entry =>
            entry.address === addressText &&
            entry.swapChain === GlobalConst.zecSwapChain,
        )
      : undefined;
  /** Contacts whose name starts with what is typed, while it is not an address. */
  const contactMatches = (() => {
    const typed = addressText.trim().toLowerCase();
    if (!typed || validAddress === 1 || ADDRESS_LIKE.test(typed)) {
      return [];
    }
    const query = typed.replace(/\.(zec|zcash)$/, '');
    return addressBook
      .filter(
        entry =>
          !entry.own &&
          entry.swapChain === GlobalConst.zecSwapChain &&
          entry.label.toLowerCase().startsWith(query),
      )
      .slice(0, 5);
  })();
  /** What is still confirming: the balance it is not yet spendable. */
  const confirmingAmount =
    stillConfirming && totalBalance
      ? Math.max(
          0,
          totalBalance.totalIronwoodBalance +
            totalBalance.totalOrchardBalance +
            totalBalance.totalSaplingBalance -
            totalBalance.totalSpendableBalance,
        )
      : 0;

  const returnPage = (
    <View
      style={{ flex: 1 }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View
        accessible={true}
        accessibilityLabel={translate('send.title-acc') as string}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '100%',
        }}
      >
        <View
          onLayout={e => {
            const { height } = e.nativeEvent.layout;
            setHeaderH(height);
            keyboardListeners(height);
          }}
        >
          <Header
            title={''}
            setPrivacyOption={setPrivacyOption}
            addLastSnackbar={addLastSnackbar /* context */}
            setShieldingAmount={setShieldingAmount}
            setBackgroundError={setBackgroundError /* context */}
            showMessagesIcon={true}
            onUsdRowLayout={setUsdRowH}
            onPriceRowLayout={setPriceRowH}
          />
        </View>
      </View>
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, sheetSlideStyle]}
      >
        <AppSheet
          ref={sendSheetRef}
          snapPoints={sendSnapPoints}
          onChange={i => {
            internalSnapIndexRef.current = i;
            onPriceSnapChange(i);
          }}
          header={sendHeader}
        >
          <ScrollView
            ref={scrollViewRef}
            onContentSizeChange={(_, height) => setContentHeight(height)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{}}
            testID="send.scroll-view"
            bounces={false}
            alwaysBounceVertical={false}
          >
            <View
              style={{
                marginBottom:
                  Platform.OS === GlobalConst.platformOSandroid ? 30 : 250,
                paddingHorizontal: space20,
                paddingTop: 5,
              }}
            >
              <RecipientField
                text={addressText}
                onChangeText={text =>
                  updateToField(text, null, null, null, null)
                }
                onClear={() => updateToField('', null, null, null, null)}
                valid={validAddress}
                focused={focusedField === 'address'}
                onFocus={() => setFocusedField('address')}
                onBlur={() => setFocusedField('none')}
                contact={recipientContact}
                pickedName={
                  !recipientContact && zns?.address === addressText
                    ? zns.alias
                    : ''
                }
                matches={contactMatches}
                lookup={nameLookup}
                onPickContact={entry =>
                  updateToField(entry.address, null, null, null, null)
                }
                onPickName={(name, address) => {
                  setZns({ alias: name, address });
                  updateToField(address, null, null, null, null);
                }}
                onOpenBook={openBook}
                onScan={setQrcodeModalShow}
                scanRef={scanButton}
                onSaveContact={() =>
                  launchAddTagModal(
                    addressText,
                    undefined,
                    zns?.address === addressText ? zns.alias : undefined,
                  )
                }
                busy={updatingToField}
              />

              <AmountCard
                value={inputZec ? amountText : amountCurrencyText}
                onChangeText={text => {
                  // typing an amount drops the MAX intent
                  sendAllRef.current = false;
                  if (inputZec) {
                    updateToField(
                      null,
                      text.substring(0, 20),
                      null,
                      null,
                      null,
                    );
                  } else {
                    updateToField(
                      null,
                      null,
                      text.substring(0, 15),
                      null,
                      null,
                    );
                  }
                }}
                unit={inputZec ? info.currencyName : 'USD'}
                onToggleUnit={
                  showFiat && quote.kind !== 'none'
                    ? () => {
                        if (inputZec && !amountCurrencyText) {
                          setAmountCurrencyText(
                            toFiatText(amountText, zecPrice.zecPrice),
                          );
                        }
                        setInputZec(!inputZec);
                      }
                    : undefined
                }
                converted={
                  inputZec
                    ? quote.kind === 'quote'
                      ? `≈ $${Utils.parseNumberFloatToStringLocale(
                          (Utils.parseStringLocaleToNumberFloat(amountText) ||
                            0) * quote.price,
                          2,
                        )}`
                      : ''
                    : `≈ ${Utils.parseNumberFloatToStringLocale(
                        Utils.parseStringLocaleToNumberFloat(amountText) || 0,
                        4,
                      )} ${info.currencyName}`
                }
                available={
                  privacy
                    ? `••••• ${info.currencyName}`
                    : `${Utils.splitZecAmountIntoBigSmall(maxAmount).bigPart} ${info.currencyName}`
                }
                availableError={spendableError}
                onMax={() => {
                  if (spendableBalanceLastError || proposeSendLastError) {
                    sendErrorSheetRef.current?.present();
                    return;
                  }
                  if (maxAmount <= 0) {
                    return;
                  }
                  const maxStr = Utils.parseNumberFloatToStringLocale(
                    maxAmount,
                    8,
                  );
                  sendAllRef.current = true;
                  updateToField(null, maxStr, null, null, null);
                  calculateFeeWithPropose(
                    maxStr,
                    addressText,
                    memoText,
                    includeUAMemoBoolean,
                  );
                }}
                fee={
                  fee > 0
                    ? `${Utils.parseNumberFloatToStringLocale(fee, 4)} ${info.currencyName}`
                    : ''
                }
                invalid={validAmount < 0}
                focused={focusedField === 'amount'}
                onFocus={() => setFocusedField('amount')}
                onBlur={() => setFocusedField('none')}
              />
              {validAmount < 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    columnGap: 6,
                    marginTop: 6,
                  }}
                >
                  <InfoIcon size={14} color={colors.fgPriceDown} />
                  <Text
                    testID="send.amount.error"
                    variant="caption"
                    style={{ color: colors.fgPriceDown, flexShrink: 1 }}
                  >
                    {validAmount === -1
                      ? (translate('send.amount-zero') as string)
                      : confirmingAmount > 0
                        ? (translate('send.amount-confirming') as string)
                            .replace(
                              '{confirming}',
                              `${Utils.splitZecAmountIntoBigSmall(confirmingAmount).bigPart} ${info.currencyName}`,
                            )
                            .replace(
                              '{max}',
                              `${Utils.splitZecAmountIntoBigSmall(maxAmount).bigPart} ${info.currencyName}`,
                            )
                        : (translate('send.amount-over') as string)}
                  </Text>
                </View>
              )}

              {memoEnabled === true &&
                (memoOpen || !!memoText ? (
                  <View style={{ marginTop: 14 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        variant="caption"
                        tone="muted"
                        style={{ fontWeight: '600' }}
                      >
                        {translate('send.memo') as string}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {translate('send.memo-private') as string}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        borderWidth: 1,
                        borderRadius: 12,
                        borderColor: fieldBorder(
                          colors,
                          focusedField === 'memo',
                          memoTooLong ? 'invalid' : 'unknown',
                        ),
                        backgroundColor: colors.bgCanvas,
                        minHeight: 48,
                        maxHeight: 130,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                      }}
                    >
                      <TextInput
                        testID="send.memo-field"
                        accessibilityLabel={
                          translate('send.memo-acc') as string
                        }
                        placeholder={
                          translate('send.memo-placeholder') as string
                        }
                        placeholderTextColor={colors.fgMuted}
                        multiline
                        style={{
                          flex: 1,
                          color:
                            validMemo === -1
                              ? colors.fgDanger
                              : colors.fgDefault,
                          fontSize: 15,
                          minHeight: 28,
                          padding: 0,
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
                          const tall =
                            e.nativeEvent.contentSize.height >
                            (Platform.OS === GlobalConst.platformOSandroid
                              ? 70
                              : 35);
                          if (tall !== memoIcon) {
                            setMemoIcon(tall);
                            if (tall) {
                              scrollToEnd();
                            }
                          }
                        }}
                        maxLength={GlobalConst.memoMaxLength}
                        onBlur={() => setFocusedField('none')}
                        onFocus={() => {
                          setFocusedField('memo');
                          // The sheet opens to its top stop so the memo and
                          // the rest of the form stay above the keyboard.
                          safeSnapToIndex(
                            sendSheetRef,
                            sendSnapPoints.length - 1,
                            sendSnapPoints.length,
                          );
                          if (keyboardVisible) {
                            scrollToEnd();
                          } else {
                            setTimeout(() => scrollToEnd(), 1000);
                          }
                        }}
                      />
                      {!!memoText && (
                        <TouchableOpacity
                          hitSlop={slopFor(20)}
                          onPress={() =>
                            updateToField(null, null, null, '', null)
                          }
                        >
                          <XIcon size={18} color={colors.fgMuted} />
                        </TouchableOpacity>
                      )}
                      {memoIcon && (
                        <TouchableOpacity
                          hitSlop={slopFor(24)}
                          onPress={() => setMemoModalShow()}
                          style={{ marginLeft: 6 }}
                        >
                          <ZoomInIcon size={22} color={colors.fgMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text
                      testID="send.memo-count"
                      variant="caption"
                      style={{
                        textAlign: 'right',
                        marginTop: 4,
                        color: memoTooLong
                          ? colors.fgPriceDown
                          : colors.fgMuted,
                      }}
                    >
                      {(translate('send.memo-count') as string)
                        .replace(
                          '{n}',
                          String(
                            Utils.countMemoBytes(
                              memoText,
                              includeUAMemoBoolean,
                              defaultUnifiedAddress,
                            ),
                          ),
                        )
                        .replace('{max}', String(GlobalConst.memoMaxLength))}
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    testID="send.memo-open"
                    accessibilityRole="button"
                    onPress={() => setMemoOpen(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      columnGap: 6,
                      marginTop: 14,
                      minHeight: 40,
                    }}
                  >
                    <PlusIcon size={16} color={colors.fgPriceUp} />
                    <Text
                      variant="caption"
                      style={{ fontWeight: '700', color: colors.fgPriceUp }}
                    >
                      {translate('send.memo-add') as string}
                    </Text>
                  </Pressable>
                ))}

              {/* The button waits while the mixnet cannot carry a send, and says
                  why and what the transport is doing. */}
              {mixnetView.kind === 'transport' && mixnetView.sendBlocked && (
                <View
                  testID="send.mixnet-blocked"
                  style={{ alignItems: 'center', rowGap: 4, marginTop: 16 }}
                >
                  <Text
                    variant="bodySmall"
                    tone="muted"
                    style={{ textAlign: 'center' }}
                  >
                    {translate('send.nym-blocked') as string}
                  </Text>
                  <Text
                    variant="body"
                    style={{ textAlign: 'center', fontWeight: '500' }}
                  >
                    {translate(shownStatusKey(mixnetView)) as string}
                  </Text>
                </View>
              )}
              <View style={{ marginTop: 14, marginBottom: 20 }}>
                {showCalcError ? (
                  <Button
                    variant="text"
                    title={`${translate('send.calc-error') as string} ⓘ`}
                    onPress={() => sendErrorSheetRef.current?.present()}
                    testID="send.calc-error"
                  />
                ) : (
                  <Button
                    testID={
                      sendButtonEnabled ? 'send.button' : 'send.button-disabled'
                    }
                    accessibilityLabel={'title ' + translate('send.review')}
                    variant="primary"
                    title={translate('send.review') as string}
                    disabled={!sendButtonEnabled}
                    onPress={async () => {
                      setSendButtonEnabled(false);
                      updateToField(null, null, null, memoText, null);
                      if (!netInfo.isConnected || server.kind === 'offline') {
                        addLastSnackbar(
                          translate('loadedapp.connection-error') as string,
                        );
                        return;
                      }
                      if (
                        validAmount === 1 &&
                        amountText &&
                        isSendAllAmount(amountText)
                      ) {
                        addLastSnackbar(
                          `${translate('send.sendall-message') as string}`,
                        );
                      }
                      // A transparent address carries no memo.
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
            </View>
          </ScrollView>
        </AppSheet>
      </Animated.View>
      <AppSheetModal
        ref={memoBottomSheetRef}
        header={memoHeader}
        contentStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
        }}
      >
        <Memo
          key={memoSheetKey}
          closeSheet={() => memoBottomSheetRef.current?.dismiss()}
          initialMemo={memoText}
          includeUAMemoBoolean={includeUAMemoBoolean}
          defaultUnifiedAddress={defaultUnifiedAddress}
          setMemoText={setMemoText}
          translate={translate}
        />
      </AppSheetModal>
      <SendErrorSheet
        ref={sendErrorSheetRef}
        title={translate('send.calc-error') as string}
        spendableError={spendableBalanceLastError}
        feeError={proposeSendLastError}
        spendableLabel={translate('send.spendable') as string}
        feeLabel={translate('send.fee') as string}
        onSupport={() => {
          const parts: string[] = [];
          if (spendableBalanceLastError) {
            parts.push(
              `${translate('send.spendable') as string}: ${spendableBalanceLastError}`,
            );
          }
          if (proposeSendLastError) {
            parts.push(
              `${translate('send.fee') as string}: ${proposeSendLastError}`,
            );
          }
          sendEmail(
            translate,
            zingolibVersion,
            translate('send.calc-error') as string,
            parts.join('\n\n'),
          );
        }}
        translate={translate}
      />
    </View>
  );

  return returnPage;
};

export default React.memo(Send);
