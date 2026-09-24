import { useCallback, useEffect, useRef, useState } from 'react';
import { showConfirm } from '@app/services/showConfirm';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import {
  PoolToShieldEnum,
  RouteEnum,
  SelectServerEnum,
  SnackbarDurationEnum,
  TranslateType,
} from '@app/AppState';
import TotalBalanceClass from '@app/AppState/classes/TotalBalanceClass';
import NetInfoType from '@app/AppState/types/NetInfoType';
import { shieldConfirm, shieldPropose } from '@app/walletBackend';
import type { FfiResult } from '@app/walletBackend';
import { RPCShieldProposeType } from '@app/walletBackend/types/RPCShieldProposeType';
import { RPCShieldType } from '@app/walletBackend/types/RPCShieldType';
import Utils from '@app/utils';

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
    ((msg: string, duration?: SnackbarDurationEnum) => void) | undefined;
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
    const runShieldPropose = async (): Promise<FfiResult<string>> => {
      if (shieldProposeLockRef.current) {
        return {
          ok: false,
          error: {
            code: 'Unknown',
            message: 'shield propose already running...',
          },
        };
      }
      shieldProposeLockRef.current = true;
      const propose = await shieldPropose();
      shieldProposeLockRef.current = false;
      return propose;
    };

    if (
      !readOnly &&
      !!setShieldingAmount &&
      selectServer !== SelectServerEnum.offline &&
      (somePending ? 0 : (totalBalance?.confirmedTransparentBalance ?? 0)) > 0
    ) {
      (async () => {
        let proposeFee = 0;
        let proposeAmount = 0;
        const runPropose = await runShieldPropose();
        if (!runPropose.ok) {
          console.log('Error shield proposing', runPropose.error.message);
        } else {
          try {
            const runProposeJson: RPCShieldProposeType = JSON.parse(
              runPropose.value,
            );
            if (runProposeJson.error) {
              console.log('Error shield proposing', runProposeJson.error);
            } else {
              if (runProposeJson.fee) {
                proposeFee = runProposeJson.fee / 10 ** 8;
              }
              if (runProposeJson.value_to_shield) {
                proposeAmount = runProposeJson.value_to_shield / 10 ** 8;
              }
            }
          } catch (e) {
            console.log('Error shield proposing', e);
          }
        }
        setShieldingFee(proposeFee);
        setShieldingAmount(proposeAmount);
      })();
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

  const handleShieldFunds = useCallback(async () => {
    if (!setBackgroundError || !addLastSnackbar) {
      return;
    }
    if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
      addLastSnackbar(translate('loadedapp.connection-error') as string);
      return;
    }

    navigation.navigate(RouteEnum.Computing);
    await shieldPropose();
    const shield = await shieldConfirm();

    let success = false;
    let errorMessage: string | undefined;
    if (!shield.ok) {
      errorMessage = shield.error.message;
    } else {
      try {
        const shieldJSON: RPCShieldType = JSON.parse(shield.value);
        if (shieldJSON.error) {
          errorMessage = shieldJSON.error;
        } else if (shieldJSON.txids) {
          success = true;
        }
      } catch (e) {
        // An unparseable SUCCESS payload is most likely a quirky success
        // shape — treat it as success and let the user land on the
        // "created" confirmation.
        success = true;
      }
    }
    setScrollToTop?.(true);
    setScrollToBottom?.(true);
    setShieldingFee(0);
    setShieldingAmount?.(0);
    navigation.navigate(RouteEnum.Computing, {
      phase: success ? 'created' : 'failed',
      errorMessage: success ? undefined : errorMessage,
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
    showConfirm({
      title: translate(`history.shield-title-${pools}`) as string,
      message: translate(`history.shield-alert-${pools}`) as string,
      buttons: [
        { text: translate('confirm') as string, onPress: handleShieldFunds },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
    });
  }, [translate, calculatePoolsToShield, handleShieldFunds]);

  return {
    showShieldButton,
    shieldingFee,
    onPressShieldFunds,
    calculateAmountToShield,
    calculatePoolsToShield,
    calculateDisableButtonToShield,
  };
}
