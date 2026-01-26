/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useMemo, useState } from 'react';
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
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowDown,
  faCheckCircle,
  faCircle,
} from '@fortawesome/free-solid-svg-icons';
import LiquidPrimaryButton from '../LiquidPrimaryButton';
import { ThemeType } from '../../../app/types/ThemeType';
import {
  ChainNameEnum,
  RouteEnum,
  SendPageStateClass,
  ToAddrClass,
  ValueTransferKindEnum,
  ValueTransferType,
} from '../../../app/AppState';
import { AppDrawerParamList } from '../../../app/types';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { ContextAppLoaded } from '../../../app/context';
import { StakingActionType } from '../../../app/AppState';
import Utils from '../../../app/utils';
import {
  MINER_ADDRESS_REGTEST,
  MINER_ADDRESS_TESTNET,
} from '../../../app/utils/constants';
import { HeaderTitle } from '../../Header';
import { ChevronDown } from '../../Components/Icons/Chevron';
import FadeText from '../../Components/FadeText';

type ModalState = 'idle' | 'sending' | 'success';

type RedelegateProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Redelegate> & {
  stakeTransaction: (
    sendPageState: SendPageStateClass,
    stakingAction: StakingActionType,
  ) => Promise<string>;
};

const Redelegate: React.FC<RedelegateProps> = ({ stakeTransaction, route }) => {
  const finalizer = !!route.params && route.params.finalizer !== undefined ? route.params.finalizer : '';
  const staked = !!route.params && route.params.staked !== undefined ? route.params.staked : 0;
  const closeSheet = !!route.params && route.params.closeSheet !== undefined ? route.params.closeSheet : () => {};

  const navigation: any = useNavigation();
  const { colors } = useTheme() as unknown as ThemeType;
  const insets = useSafeAreaInsets();

  const [finalizerFromText, setFinalizerFromText] = useState<string>(finalizer);
  const [stakedFrom, setStakedFrom] = useState<number>(staked);
  const [finalizerToText, setFinalizerToText] = useState<string>('');
  const [stakedTo, setStakedTo] = useState<number>(0);
  
  const [selectedTxid, setSelectedTxid] = useState<string>('');
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [kbOpen, setKbOpen] = useState(false);

  const modalVisible = modalState !== 'idle';

  const context = useContext(ContextAppLoaded);
  const { valueTransfers, indexerServer } = context;

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
      if (vt.kind !== ValueTransferKindEnum.CreateBond) return false;

      if (!finalizerFromText) return true;
      return vt.stakingAction && vt.stakingAction.target === finalizerFromText;
    });

    const beginByBondKey = new Map<string, ValueTransferType>();
    for (const vt of valueTransfers) {
      if (vt.confirmations === 0) continue;
      if (vt.kind !== ValueTransferKindEnum.beginUnbond) continue;

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
  const hasFinalizetTo = !!finalizerToText && finalizerToText !== finalizerFromText;
  // selected a tx & selected a 'to' finalizer & different finalizers.
  const isValidForm = hasSelectedTx && hasFinalizetTo;

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  useEffect(() => {
    if (!finalizerFromText) {
      navigation.navigate(
        RouteEnum.Finalizers, 
        {
          setFinalizer: (f: string, s: number) => {
            setFinalizerFromText(f);
            setStakedFrom(s);
          },
          scope: 'my',
          exclude: finalizerToText,
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const shortenTxid = (txid: string) => {
    if (txid.length <= 16) {
      return txid;
    }
    return `${txid.slice(0, 10)}…${txid.slice(-8)}`;
  };

  const handleUnstakePress = async () => {
    if (!isValidForm || !selectedTx) {
      return;
    }

    const miner = selectedTx.address;

    if (!miner) {
      Alert.alert(
        'Missing miner address',
        'Could not determine the miner address from the selected transaction.',
      );
      return;
    }

    setModalState('sending');

    const sendPageState = new SendPageStateClass(new ToAddrClass(0));
    sendPageState.toaddr.to =
      indexerServer.chainName === ChainNameEnum.regtestChainName
        ? MINER_ADDRESS_REGTEST
        : MINER_ADDRESS_TESTNET;
    sendPageState.toaddr.memo = ''; // No memo. This is just a plain unstake request
    // 0-value tx. The staking action captures the amount in zats
    sendPageState.toaddr.amount = Utils.parseNumberFloatToStringLocale(0, 8);

    const stakingAction: StakingActionType = {
      kind: 'begin_unbonding',
      unique_public_key: 'IGNORE THIS. RUST PUTS SOMETHING HERE',
      // use the backend value in zats directly
      val: 0, // incorredt - need to fix.
      target:
        (selectedTx.stakingAction && selectedTx.stakingAction?.target) || '',
    };

    console.log('UNSTAKING action:', stakingAction);

    try {
      await stakeTransaction(sendPageState, stakingAction);
      setModalState('success');
    } catch (error) {
      console.warn('Unstake tx failed:', error);
      setModalState('idle');
      navigation.navigate(RouteEnum.ComputingError, { error: `${error}` });
    }
  };

  const handleViewMovements = () => {
    setModalState('idle');
    closeSheet();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const renderSeparator = () => <View style={{ height: 8 }} />;

  const renderStakedTxItem = ({ item }: { item: ValueTransferType }) => {
    const isSelected = item.txid === selectedTxid;

    let displayAmount = String(item.amount);

    return (
      <Pressable
        onPress={() => {
          setSelectedTxid(item.txid);
          //if (item.stakingAction?.target) {
          //  setFinalizerFromText(item.stakingAction.target);
            // TODO: find the staked amount for this finalizer
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
            {item.txid}
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

        <HeaderTitle title='Redelegate' goBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }} />

        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
            marginTop: 15,
            marginHorizontal: 20
          }}
        >
          Finalizer addresses
        </Text>

        <TouchableOpacity
          onPress={() => 
            navigation.navigate(
              RouteEnum.Finalizers, 
              {
                setFinalizer: (f: string, s: number) => {
                  setFinalizerFromText(f);
                  setStakedFrom(s);
                },
                scope: 'my',
                exclude: finalizerToText,
              }
            )
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
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <FontAwesomeIcon style={{ marginRight: 15 }} size={20} icon={faCircle} color='rgba(143, 191, 250, 1)' />
              <View style={{ justifyContent: 'center', alignItems: 'flex-start', gap: 0 }}>
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
                {!!stakedFrom && <FadeText style={{ marginLeft: 5, marginBottom: 10 }}>{`Staked: ${stakedFrom}`}</FadeText>}
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

        <View>
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
              width: 50,
              alignSelf: 'center',
            }}
          >
            <FontAwesomeIcon
              icon={faArrowDown}
              size={25}
              color={colors.text}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => 
            navigation.navigate(
              RouteEnum.Finalizers, 
              {
                setFinalizer: (f: string, s: number) => {
                  setFinalizerToText(f);
                  setStakedTo(s);
                },
                scope: 'network',
                exclude: finalizerFromText,
              }
            )
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
              marginTop: -15,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <FontAwesomeIcon style={{ marginRight: 15 }} size={20} icon={faCircle} color='#FC0' />
              <View style={{ justifyContent: 'center', alignItems: 'flex-start', gap: 0 }}>
                <TextInput
                  style={{
                    color: colors.text,
                    fontSize: 17,
                    fontWeight: '400',
                  }}
                  placeholder="Tap here for finalizer address" 
                  placeholderTextColor={colors.placeholder}
                  value={Utils.trimToSmall(finalizerToText, 7)}
                  editable={false}
                />
                {!!stakedTo && <FadeText style={{ marginLeft: 5, marginBottom: 10 }}>{`Staked: ${stakedTo}`}</FadeText>}
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
            Choose stake to remove (TXID)
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: colors.placeholder,
              marginBottom: 8,
            }}
          >
            Select the original staking transaction. The unstake amount will be
            the value from that transaction.
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
                  You don&apos;t have any staked positions to unstake.
                </Text>
              }
            />
          </View>

          {selectedTx && (
            <Text
              style={{
                fontSize: 13,
                color: colors.placeholder,
                marginBottom: 8,
              }}
            >
              Amount to unstake:{' '}
              <Text
                style={{
                  color: colors.text,
                  fontWeight: '500',
                }}
              >
                {(() => {
                    return `${selectedTx.amount} cTAZ`;
                })()}
              </Text>
            </Text>
          )}
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
            title="Unstake"
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
                { backgroundColor: colors.background, borderColor: colors.border },
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

export default Redelegate;
