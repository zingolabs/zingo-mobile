import { Alert } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import {
  GlobalConst,
  PoolToShieldEnum,
  RouteEnum,
  SelectServerEnum,
  SnackbarDurationEnum,
  TranslateType,
} from '../AppState';
import TotalBalanceClass from '../AppState/classes/TotalBalanceClass';
import NetInfoType from '../AppState/types/NetInfoType';
import { createAlert } from '../createAlert';
import RPC from '../walletBackend';
import RPCModule from '../RPCModule';
import Utils from '../utils';

type UseShieldFundsInput = {
  readOnly: boolean;
  setShieldingAmount: ((value: number) => void) | undefined;
  selectServer: SelectServerEnum;
  somePending: boolean;
  totalBalance: TotalBalanceClass | null;
  shieldingAmount: number;
  translate: (key: string) => TranslateType;
  netInfo: NetInfoType;
  addLastSnackbar:
    | ((msg: string, duration?: SnackbarDurationEnum) => void)
    | undefined;
  setBackgroundError: ((title: string, err: string) => void) | undefined;
  setScrollToTop: ((v: boolean) => void) | undefined;
  setScrollToBottom: ((v: boolean) => void) | undefined;
};

type UseShieldFundsResult = {
  showShieldButton: boolean;
  shieldingFee: number;
  onPressShieldFunds: () => void;
  calculateAmountToShield: () => string;
  calculatePoolsToShield: () => string;
  calculateDisableButtonToShield: () => boolean;
};

/**
 * Orchestrates the transparent-pool shielding flow.
 *
 * Runs a shield proposal on mount / when balance changes to pre-calculate the
 * fee and shieldable amount. Exposes `onPressShieldFunds` which shows a
 * confirmation alert then executes the shield transaction via RPC, navigates
 * to the Computing screen while work is in progress, and returns to History on
 * success.
 *
 * `showShieldButton` is true only when there is a positive unshielded balance,
 * no pending transactions, the wallet is not read-only, and the server is
 * online.
 */
export function useShieldFunds({
  readOnly,
  setShieldingAmount,
  selectServer,
  somePending,
  totalBalance,
  shieldingAmount,
  translate,
  netInfo,
  addLastSnackbar,
  setBackgroundError,
  setScrollToTop,
  setScrollToBottom,
}: UseShieldFundsInput): UseShieldFundsResult {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [showShieldButton, setShowShieldButton] = useState<boolean>(false);
  const [shieldingFee, setShieldingFee] = useState<number>(0);
  // useRef so the lock persists across re-renders (a `let` inside useEffect resets every invocation)
  const shieldProposeLockRef = useRef<boolean>(false);

  useEffect(() => {
    const runShieldPropose = async (): Promise<void> => {
      if (shieldProposeLockRef.current) {
        return;
      }
      shieldProposeLockRef.current = true;
      try {
        const proposal = await RPCModule.shieldProcess();
        setShieldingFee(proposal.fee / 10 ** 8);
        setShieldingAmount?.(proposal.value_to_shield / 10 ** 8);
      } catch (error) {
        console.log('Error shield proposing', error);
        setShieldingFee(0);
        setShieldingAmount?.(0);
      } finally {
        shieldProposeLockRef.current = false;
      }
    };

    if (
      !readOnly &&
      !!setShieldingAmount &&
      selectServer !== SelectServerEnum.offline &&
      (somePending ? 0 : (totalBalance?.confirmedTransparentBalance ?? 0)) > 0
    ) {
      runShieldPropose();
    } else {
      setShieldingFee(0);
      setShieldingAmount?.(0);
    }
  }, [
    readOnly,
    setShieldingAmount,
    totalBalance,
    totalBalance?.confirmedTransparentBalance,
    somePending,
    selectServer,
  ]);

  useEffect(() => {
    setShowShieldButton(
      !readOnly &&
        selectServer !== SelectServerEnum.offline &&
        (somePending ? 0 : shieldingAmount) > 0,
    );
  }, [readOnly, shieldingAmount, somePending, selectServer]);

  const shieldFunds = useCallback(async () => {
    if (!setBackgroundError || !addLastSnackbar) {
      return;
    }
    if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
      addLastSnackbar(translate('loadedapp.connection-error') as string);
      return;
    }

    const pools: PoolToShieldEnum = PoolToShieldEnum.transparentPoolToShield;

    navigation.navigate(RouteEnum.Computing);
    // Re-propose immediately before confirm so the stored proposal is fresh.
    await RPCModule.shieldProcess();
    const txidsStr = await RPC.rpcShieldFunds();

    if (txidsStr.toLowerCase().startsWith(GlobalConst.error)) {
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        translate(`history.shield-title-${pools}`) as string,
        `${translate(`history.shield-error-${pools}`)} ${txidsStr}`,
        true,
        translate,
      );
    } else {
      createAlert(
        setBackgroundError,
        addLastSnackbar,
        translate(`history.shield-title-${pools}`) as string,
        `${translate(`history.shield-message-${pools}`)} ${txidsStr}`,
        true,
        translate,
      );
    }
    setScrollToTop?.(true);
    setScrollToBottom?.(true);
    setShieldingFee(0);
    setShieldingAmount?.(0);
    navigation.navigate(RouteEnum.HomeStack, {
      screen: RouteEnum.History,
    });
  }, [
    setBackgroundError,
    addLastSnackbar,
    netInfo.isConnected,
    selectServer,
    translate,
    navigation,
    setScrollToTop,
    setScrollToBottom,
    setShieldingAmount,
  ]);

  const calculatePoolsToShield = useCallback(
    (): string => PoolToShieldEnum.transparentPoolToShield,
    [],
  );

  const calculateAmountToShield = useCallback(
    (): string =>
      Utils.parseNumberFloatToStringLocale(
        somePending ? 0 : shieldingAmount,
        8,
      ),
    [somePending, shieldingAmount],
  );

  const calculateDisableButtonToShield = useCallback(
    (): boolean => (somePending ? 0 : shieldingAmount) <= 0,
    [somePending, shieldingAmount],
  );

  const onPressShieldFunds = useCallback(() => {
    const pools = calculatePoolsToShield();
    Alert.alert(
      translate(`history.shield-title-${pools}`) as string,
      translate(`history.shield-alert-${pools}`) as string,
      [
        { text: translate('confirm') as string, onPress: shieldFunds },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
      { cancelable: false },
    );
  }, [translate, calculatePoolsToShield, shieldFunds]);

  return {
    showShieldButton,
    shieldingFee,
    onPressShieldFunds,
    calculateAmountToShield,
    calculatePoolsToShield,
    calculateDisableButtonToShield,
  };
}
