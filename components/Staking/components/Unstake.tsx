/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  FlatList,
  Alert,
  NativeModules,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation, useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheckCircle, faCircle } from '@fortawesome/free-solid-svg-icons';
import LiquidPrimaryButton from '../LiquidPrimaryButton';
import { ThemeType } from '../../../app/types/ThemeType';
import {
  RouteEnum,
  SendPageStateClass,
  ValueTransferType,
} from '../../../app/AppState';
import { AppDrawerParamList } from '../../../app/types';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { ContextAppLoaded } from '../../../app/context';
import { StakingActionType } from '../../../app/AppState';
import Utils from '../../../app/utils';
import { HeaderTitle } from '../../Header';
import { ChevronDown } from '../../Components/Icons/Chevron';
import FadeText from '../../Components/FadeText';

type ModalState = 'idle' | 'sending' | 'success';

type UnstakeProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Unstake> & {
  stakeTransaction: (
    sendPageState: SendPageStateClass,
    stakingAction: StakingActionType,
  ) => Promise<string>;
  beginUnstakeTransaction: (txid: string) => Promise<string>;
  withdrawBondTransaction: (txid: string) => Promise<string>;
};

const Unstake: React.FC<UnstakeProps> = ({
  beginUnstakeTransaction,
  withdrawBondTransaction,
  route,
}) => {
  const finalizer =
    !!route.params && route.params.finalizer !== undefined
      ? route.params.finalizer
      : '';
  const staked =
    !!route.params && route.params.staked !== undefined
      ? route.params.staked
      : 0;
  const closeSheet =
    !!route.params && route.params.closeSheet !== undefined
      ? route.params.closeSheet
      : () => {};

  const navigation: any = useNavigation();
  const { colors } = useTheme() as unknown as ThemeType;
  const insets = useSafeAreaInsets();

  const { RPCModule } = NativeModules as {
    RPCModule: {
      // Promise resolves to a string (either "Error: ..." or the u64 value in zats)
      getAccumulatedStakeForTxidInfo(txid: string): Promise<string>;
    };
  };

  const [finalizerFromText, setFinalizerFromText] = useState<string>(finalizer);
  const [stakedFrom, setStakedFrom] = useState<number>(staked);
  const [selectedTxid, setSelectedTxid] = useState<string>('');
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [kbOpen, setKbOpen] = useState(false);

  const launchedSelectorRef = useRef<boolean>(false);

  const [_accumulatedStakeByTxid, setAccumulatedStakeByTxid] = useState<
    Record<string, string>
  >({});

  const modalVisible = modalState !== 'idle';

  const context = useContext(ContextAppLoaded);
  const { valueTransfers } = context;

  const movements: ValueTransferType[] = useMemo(() => {
    if (!valueTransfers) return [];

    const bondKeyOf = (vt: ValueTransferType): string | null => {
      if (vt.confirmations === 0) return null;
      const sa = vt.stakingAction;
      if (!sa) return null;
      const k = sa.unique_public_key ?? null;
      return typeof k === 'string' && /^[0-9a-fA-F]{64}$/.test(k)
        ? k.toLowerCase()
        : null;
    };

    const createBonds = valueTransfers.filter(vt => {
      if (vt.confirmations === 0) return false;
      const sa = vt.stakingAction;
      if (!sa || sa.kind !== 'create_bond') return false;

      if (!finalizerFromText) return true;
      return sa.target === finalizerFromText;
    });

    const beginByBondKey = new Map<string, ValueTransferType>();
    for (const vt of valueTransfers) {
      if (vt.confirmations === 0) continue;
      const sa = vt.stakingAction;
      if (!sa || sa.kind !== 'begin_unbonding') continue;

      const k = bondKeyOf(vt);
      if (!k) continue;

      const prev = beginByBondKey.get(k);
      if (!prev || vt.time > prev.time) beginByBondKey.set(k, vt);
    }

    const out: ValueTransferType[] = [];
    const seen = new Set<string>();

    for (const bond of createBonds) {
      const k = bondKeyOf(bond);

      const begin = k ? beginByBondKey.get(k) : undefined;

      const row: ValueTransferType = begin
        ? ({
            ...begin,
            fee: bond.fee,
            stakingAction: begin.stakingAction
              ? {
                  ...begin.stakingAction,
                  val: bond.stakingAction?.val ?? begin.stakingAction.val,
                  target:
                    bond.stakingAction?.target ?? begin.stakingAction.target,
                  unique_public_key:
                    bond.stakingAction?.unique_public_key ??
                    begin.stakingAction.unique_public_key,
                }
              : begin.stakingAction,
          } as ValueTransferType)
        : bond;

      if (!seen.has(row.txid)) {
        out.push(row);
        seen.add(row.txid);
      }
    }

    return out.sort((a, b) => b.time - a.time);
  }, [finalizerFromText, valueTransfers]);

  const selectedTx = movements.find(tx => tx.txid === selectedTxid);
  const hasSelectedTx = !!selectedTx;
  const isValidForm = hasSelectedTx;

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (launchedSelectorRef.current && !finalizerFromText) {
        if (navigation.canGoBack) {
          navigation.goBack();
        }
      }
    }, [finalizerFromText, navigation])
  );
  
  useEffect(() => {
    if (!finalizerFromText) {
      launchedSelectorRef.current = true;
      navigation.navigate(RouteEnum.Finalizers, {
        setFinalizer: (f: string, s: number) => {
          setFinalizerFromText(f);
          setStakedFrom(s);
        },
        scope: 'my',
        exclude: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch accumulated stake for each txid shown in the list
  useEffect(() => {
    let cancelled = false;

    const fetchAccumulatedStake = async () => {
      const updates: Record<string, string> = {};

      for (const m of movements) {
        try {
          const resp = await RPCModule.getAccumulatedStakeForTxidInfo(m.txid);

          if (typeof resp !== 'string') {
            continue;
          }

          if (resp.toLowerCase().startsWith('error:')) {
            console.warn(
              '[Unstake] getAccumulatedStakeForTxidInfo error for',
              m.txid,
              resp,
            );
            continue;
          }

          // resp is the u64 number (zats) converted to string on Swift side
          updates[m.txid] = resp;
        } catch (e) {
          console.warn(
            '[Unstake] getAccumulatedStakeForTxidInfo failed for',
            m.txid,
            e,
          );
        }
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        setAccumulatedStakeByTxid(prev => ({ ...prev, ...updates }));
      }
    };

    if (movements.length > 0) {
      fetchAccumulatedStake();
    }

    return () => {
      cancelled = true;
    };
  }, [movements, RPCModule]);

  const shortenTxid = (txid: string) => {
    if (txid.length <= 16) {
      return txid;
    }
    return `${txid.slice(0, 10)}…${txid.slice(-8)}`;
  };

  // const getAccumulatedStakeZatsForTxid = (txid: string): number | null => {
  //   const zatsStr = accumulatedStakeByTxid[txid];
  //   if (!zatsStr) {
  //     return null;
  //   }
  //   const zats = Number(zatsStr);
  //   if (Number.isNaN(zats)) {
  //     return null;
  //   }
  //   return zats;
  // };

  const isHex64 = (s: string) => /^[0-9a-fA-F]{64}$/.test(s);

  const getBondTxidDisplayFromSelection = (
    _selectedTx: ValueTransferType,
    _valueTransfers: ValueTransferType[] | undefined,
  ): string | null => {
    console.log('getBondTxidDisplayFromSelection selectedTx', _selectedTx);
    console.log(
      'getBondTxidDisplayFromSelection valueTransfers',
      _valueTransfers,
    );
    const a = _selectedTx.stakingAction as any;
    if (!a) return null;

    if (a.kind === 'create_bond') return _selectedTx.txid;

    if (a.kind === 'begin_unbonding') {
      const bondKey = a.unique_public_key ?? a.arg32_0;
      if (!isHex64(bondKey)) return null;

      const match = (_valueTransfers ?? []).find(vt => {
        if (vt.confirmations === 0) return false;
        const sa = vt.stakingAction as any;
        if (!sa || sa.kind !== 'create_bond') return false;
        const k = sa.unique_public_key ?? sa.arg32_0;
        return isHex64(k) && k.toLowerCase() === bondKey.toLowerCase();
      });

      return match?.txid ?? null;
    }

    return null;
  };

  const handleUnstakePress = async () => {
    if (!isValidForm || !selectedTx) return;

    const selectedKind = selectedTx.stakingAction?.kind;

    const bondTxid = getBondTxidDisplayFromSelection(
      selectedTx,
      valueTransfers as ValueTransferType[], // TODO
    );
    if (!bondTxid) {
      Alert.alert('Error', 'Could not determine the original bond txid.');
      return;
    }

    console.log('bondTxid', bondTxid);
    console.log('selectedKind', selectedKind);

    setModalState('sending');

    try {
      if (selectedKind === 'create_bond') {
        await beginUnstakeTransaction(bondTxid);
      } else if (selectedKind === 'begin_unbonding') {
        await withdrawBondTransaction(selectedTx.txid);
      } else {
        Alert.alert(
          'Error',
          `Unsupported selection kind: ${selectedKind ?? 'none'}`,
        );
        setModalState('idle');
        return;
      }

      setModalState('success');
    } catch (error) {
      console.warn('Staking tx failed:', error);
      setModalState('idle');
      //Alert.alert('Error', 'Staking transaction failed. Please try again.');
      navigation.navigate(RouteEnum.ComputingError, { error: `${error}` });
    }
  };

  const actionVerb = useMemo(() => {
    const k = selectedTx?.stakingAction?.kind;

    if (k === 'begin_unbonding') return 'Withdraw';
    if (k === 'create_bond') return 'Unbond';

    return 'Unstake';
     
  }, [selectedTx]);

  const handleViewMovements = () => {
    setModalState('idle');
    closeSheet();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const renderSeparator = () => <View style={{ height: 8 }} />;

  const renderStakedTxItem = ({ item }: { item: ValueTransferType }) => {
    console.log('item', item);
    const isSelected = item.txid === selectedTxid;

    // const zats = getAccumulatedStakeZatsForTxid(item.txid);

    const fee = item.fee ?? 0;
    let displayAmount = String((fee - 0.0001).toFixed(2));

    // if (zats !== null) {
    //   const amountInCoin = zats / 10 ** 8;
    //   displayAmount = Utils.parseNumberFloatToStringLocale(amountInCoin, 8);
    // }

    return (
      <Pressable
        onPress={() => {
          setSelectedTxid(item.txid);
          //if (item.stakingAction?.target) {
          //  setFinalizerFromText(item.stakingAction.target);
          // TODO: find the staked amount for this finalizer.
          //  setStakedFrom(0);
          //}
        }}
        style={[
          styles.txRow,
          {
            borderColor: isSelected ? colors.primary : colors.border,
            backgroundColor: isSelected ? colors.secondary : colors.background,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 13,
              fontWeight: '500',
            }}
            numberOfLines={1}
          >
            {shortenTxid(item.txid)}
          </Text>
          <Text
            style={{
              color: colors.placeholder,
              fontSize: 11,
              marginTop: 2,
            }}
          >
            Type: {item.stakingAction?.kind || 'unknown'}
          </Text>
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: 14,
            fontWeight: '600',
            marginLeft: 12,
          }}
        >
          {displayAmount} cTAZ
        </Text>
      </Pressable>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? insets.top : kbOpen ? insets.top : 0
        }
      >
        <HeaderTitle
          title="Unstake"
          goBack={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        />

        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
            marginTop: 15,
            marginHorizontal: 20,
          }}
        >
          Finalizer address
        </Text>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate(RouteEnum.Finalizers, {
              setFinalizer: (f: string, s: number) => {
                setFinalizerFromText(f);
                setStakedFrom(s);
              },
              scope: 'my',
              exclude: '',
            })
          }
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: 20,
              marginBottom: 10,
              backgroundColor: colors.secondary,
              padding: 16,
              marginHorizontal: 10,
              borderWidth: 0.5,
              borderColor: colors.text,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <FontAwesomeIcon
                style={{ marginRight: 15 }}
                size={20}
                icon={faCircle}
                color="#FC0"
              />
              <View
                style={{
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  gap: 0,
                }}
              >
                <TextInput
                  style={{
                    color: colors.text,
                    fontSize: 17,
                    fontWeight: '400',
                  }}
                  placeholder="Tap here for finalizer address"
                  placeholderTextColor={colors.placeholder}
                  value={Utils.trimToSmall(finalizerFromText, 7)}
                  editable={false}
                />
                {!!stakedFrom && (
                  <FadeText
                    style={{ marginLeft: 5, marginBottom: 10 }}
                  >{`Voting power: ${stakedFrom}`}</FadeText>
                )}
              </View>
            </View>
            <ChevronDown
              width={30}
              height={30}
              style={{ transform: [{ rotate: '-90deg' }] }}
              color={colors.text}
            />
          </View>
        </TouchableOpacity>

        {/* Content */}
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 24,
          }}
        >
          {/* Staked TX list */}
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 8,
            }}
          >
            Active bonds
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: colors.placeholder,
              marginBottom: 8,
            }}
          >
            These are the currently-active delegation bonds, which includes
            bonded and unbonded positions.
          </Text>

          <View
            style={{
              flex: 1,
              marginBottom: 16,
            }}
          >
            <FlatList
              data={movements}
              keyExtractor={item => item.txid}
              renderItem={renderStakedTxItem}
              ItemSeparatorComponent={renderSeparator}
              ListEmptyComponent={
                <Text
                  style={{
                    color: colors.placeholder,
                    fontSize: 13,
                    textAlign: 'center',
                    marginTop: 16,
                  }}
                >
                  You don&apos;t have any delegation bonds active.
                </Text>
              }
            />
          </View>
        </View>

        {/* Bottom CTA */}
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: 20,
            paddingHorizontal: 24,
          }}
        >
          <LiquidPrimaryButton
            title={actionVerb}
            disabled={!isValidForm || modalState === 'sending'}
            onPress={handleUnstakePress}
            style={{ alignSelf: 'stretch' }}
          />
        </View>

        {/* Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (modalState === 'success') {
              setModalState('idle');
            }
          }}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              {modalState === 'sending' && (
                <>
                  <ActivityIndicator size="large" color={colors.text} />
                  <Text
                    style={{
                      marginTop: 16,
                      color: colors.text,
                      fontSize: 16,
                      textAlign: 'center',
                    }}
                  >
                    Sending unstaking transaction…
                  </Text>
                </>
              )}

              {modalState === 'success' && (
                <>
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    size={40}
                    color={colors.primary}
                  />
                  <Text
                    style={{
                      marginTop: 16,
                      color: colors.text,
                      fontSize: 18,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}
                  >
                    Unstaking request transaction sent!
                  </Text>

                  <View style={{ marginTop: 24, alignSelf: 'stretch' }}>
                    <LiquidPrimaryButton
                      title="View movements"
                      onPress={handleViewMovements}
                      style={{ alignSelf: 'stretch' }}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

export default Unstake;
