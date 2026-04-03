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
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import { ThemeType } from '../../../app/types';
import {
  RouteEnum,
  ScheduledActionType,
  StakingActionKindEnum,
  WalletBondsType,
} from '../../../app/AppState';
import { AppDrawerParamList } from '../../../app/types';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { ContextAppLoaded } from '../../../app/context';
import { HeaderTitle } from '../../Header';
import { ChevronDown } from '../../Components/Icons/Chevron';
import FadeText from '../../Components/FadeText';
import Refresh from '../../../assets/icons/refresh.svg';
import RegText from '../../Components/RegText';
import { WalletBondsStatusEnum } from '../../../app/AppState/enums/WalletBondsStatusEnum';
import ZecAmount from '../../Components/ZecAmount';
import ScheduledActionsFileImpl from '../../ScheduledActions/ScheduledActionsFileImpl';

type ModalState = 'idle' | 'sending' | 'success';

type RedelegateProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.Redelegate
> & {
  redelegateTransaction: (txid: string, finalizer: string) => Promise<string>;
};

const Redelegate: React.FC<RedelegateProps> = ({
  redelegateTransaction,
  route,
}) => {
  const finalizer =
    !!route.params && route.params.finalizer !== undefined
      ? route.params.finalizer
      : '';
  const txid =
    !!route.params && route.params.txid !== undefined ? route.params.txid : '';
  const stakedFrom =
    !!route.params && route.params.staked !== undefined
      ? route.params.staked
      : 0;
  const closeSheet =
    !!route.params && route.params.closeSheet !== undefined
      ? route.params.closeSheet
      : () => {};

  const navigation: any = useNavigation();
  const { colors } = useTheme() as ThemeType;
  const insets = useSafeAreaInsets();

  const [finalizerFromText, setFinalizerFromText] = useState<string>(finalizer);
  const [txidFrom, setTxidFrom] = useState<string>(txid);
  const [stakedFromNumber, setStakedFromNumber] = useState<number>(stakedFrom);
  const [finalizerToText, setFinalizerToText] = useState<string>('');
  const [stakedToNumber, setStakedToNumber] = useState<number>(0);

  const [selectedTxid, setSelectedTxid] = useState<string>('');
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [kbOpen, setKbOpen] = useState(false);

  const modalVisible = modalState !== 'idle';

  const context = useContext(ContextAppLoaded);
  const {
    walletBonds,
    valueTransfers,
    staked,
    globalStaked,
    info,
    privacy,
    stakingDay,
    setScheduledActions,
    scheduledActions,
  } = context;

  const movements = useMemo(() => {
    return walletBonds
      .filter(b => {
        // only active bonds.
        if (
          b.status === WalletBondsStatusEnum.Withdrawn ||
          b.status === WalletBondsStatusEnum.Unbonding
        )
          return false;
        if (!!txidFrom && b.txid === txidFrom) return true;
        if (txidFrom) return false;
        if (!!finalizerFromText && b.finalizer === finalizerFromText)
          return true;
        // no finalizer selected, all bonds visible. Impossible case for now.
        if (!finalizerFromText) return true;
        return false;
      })
      .sort((a, b) => b.amount - a.amount);
  }, [finalizerFromText, txidFrom, walletBonds]);

  const selectedBond = movements.find(tx => tx.txid === selectedTxid);
  const hasSelectedTx = !!selectedBond;
  const hasFinalizerFrom = !!finalizerFromText;
  const hasFinalizerTo =
    !!finalizerToText && finalizerToText !== finalizerFromText;
  // selected a tx & selected a 'to' finalizer & different finalizers
  const isValidForm = hasSelectedTx && hasFinalizerFrom && hasFinalizerTo;

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  useEffect(() => {
    if (
      !!finalizerFromText &&
      !!finalizerToText &&
      finalizerFromText === finalizerToText
    ) {
      setFinalizerToText('');
      setStakedToNumber(0);
    }
  }, [finalizerFromText, finalizerToText]);

  useEffect(() => {
    // looking for the voting power of the finalizer
    if (staked.filter(g => g.finalizer === finalizerFromText).length === 1) {
      setStakedFromNumber(
        staked.filter(g => g.finalizer === finalizerFromText)[0].votingPower,
      );
    } else {
      setStakedFromNumber(0);
    }
  }, [finalizerFromText, staked]);

  useEffect(() => {
    // looking for the voting power of the finalizer
    if (
      globalStaked.filter(g => g.finalizer === finalizerToText).length === 1
    ) {
      setStakedToNumber(
        globalStaked.filter(g => g.finalizer === finalizerToText)[0]
          .votingPower,
      );
    } else {
      setStakedToNumber(0);
    }
  }, [finalizerToText, globalStaked]);

  const shortenTxid = (_txid: string) => {
    if (_txid.length <= 16) {
      return _txid;
    }
    return `${_txid.slice(0, 10)}…${_txid.slice(-8)}`;
  };

  const handleRedelegatePress = async () => {
    if (!isValidForm || !selectedBond) return;

    const selectedKind = selectedBond.status;

    const bondTxid = selectedBond.txid;
    if (!bondTxid) {
      Alert.alert('Error', 'Could not determine the original bond txid.');
      return;
    }

    if (valueTransfers?.filter(v => v.txid === bondTxid).length === 0) {
      Alert.alert(
        'Error',
        'Could not determine the original bond txid as a existent Transaction.',
      );
      return;
    } else {
      const confirmations =
        valueTransfers?.filter(v => v.txid === bondTxid)[0].confirmations || 0;
      if (confirmations <= 0) {
        Alert.alert(
          'Error',
          'This bond is still processing, wait for confirmations.',
        );
        return;
      }
    }

    if (!stakingDay) {
      const isScheduled: boolean =
        scheduledActions.filter(sa => sa.txid === bondTxid).length > 0;
      if (isScheduled) {
        Alert.alert(
          'Error',
          'This bond is already scheduled, chose another one.',
        );
        return;
      }
    }

    console.log('bondTxid', bondTxid);

    let bondKey = selectedBond.pubKey;
    console.log('selectedKind', selectedKind);

    setModalState('sending');

    const stakingScheduledAction: ScheduledActionType = {
      id: 0,
      kind: StakingActionKindEnum.Move,
      amount:
        (valueTransfers?.filter(v => v.txid === bondTxid)[0].amount || 0) *
        10 ** 8,
      finalizer: finalizerFromText,
      finalizerTo: finalizerToText,
      txid: bondTxid,
      bondKey: bondKey,
    };

    try {
      if (selectedKind === WalletBondsStatusEnum.Active) {
        if (stakingDay) {
          await redelegateTransaction(bondKey, finalizerToText);
        } else {
          const list = await ScheduledActionsFileImpl.addSA(
            stakingScheduledAction,
          );
          setScheduledActions(list);
        }
      } else {
        Alert.alert(
          'Error',
          `Unsupported selection kind: ${selectedKind ?? 'none'}`,
        );
        setModalState('idle');
        return;
      }

      if (
        stakingDay &&
        scheduledActions.filter(sa => sa.txid === bondTxid).length > 0
      ) {
        const list = await ScheduledActionsFileImpl.removeSA(
          scheduledActions.filter(sa => sa.txid === bondTxid)[0].id,
        );
        setScheduledActions(list);
      }

      setModalState('success');
    } catch (error) {
      console.warn('Redelegating tx failed:', error);
      setModalState('idle');
      navigation.navigate(RouteEnum.ComputingError, { error: `${error}` });
    }
  };

  const actionVerb = useMemo(() => {
    return 'Redelegate';
  }, []);

  const handleViewMovements = () => {
    setModalState('idle');
    closeSheet();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const renderSeparator = () => <View style={{ height: 8 }} />;

  const renderStakedTxItem = ({ item }: { item: WalletBondsType }) => {
    console.log('item', item);
    const isSelected = item.txid === selectedTxid;

    let confirmations =
      valueTransfers &&
      valueTransfers.filter(v => v.txid === item.txid).length > 0
        ? valueTransfers.filter(v => v.txid === item.txid)[0].confirmations
        : 0;

    return (
      <Pressable
        onPress={() => {
          setSelectedTxid(item.txid);
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!confirmations && (
              <Refresh width={15} height={15} style={{ marginRight: 5 }} />
            )}
            <Text
              style={{
                color: colors.text,
                fontSize: 13,
                fontWeight: '500',
              }}
              numberOfLines={1}
            >
              {item.status === WalletBondsStatusEnum.Unbonding
                ? 'Inactive'
                : item.status}
            </Text>
          </View>
          <Text
            style={{
              color: colors.placeholder,
              fontSize: 11,
              marginTop: 2,
            }}
          >
            {shortenTxid(item.pubKey)}
          </Text>
        </View>
        <ZecAmount
          style={{
            alignSelf: 'center',
            marginLeft: 12,
          }}
          size={14}
          currencyName={info.currencyName}
          color={colors.text}
          amtZec={item.amount}
          privacy={privacy}
        />
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
          title="Redelegate"
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
          Finalizers addresses
        </Text>
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
              flexGrow: 1,
              flexShrink: 1,
            }}
          >
            <FontAwesomeIcon
              style={{ marginRight: 15 }}
              size={20}
              icon={faCircle}
              color="rgba(143, 191, 250, 1)"
            />
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'flex-start',
                flexGrow: 1,
                flexShrink: 1,
                gap: 0,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={{
                    flexGrow: 1,
                    flexShrink: 1,
                    color: colors.text,
                    fontSize: 17,
                    fontWeight: '400',
                  }}
                  placeholder="Tap here for finalizer address"
                  placeholderTextColor={colors.placeholder}
                  value={shortenTxid(finalizerFromText)}
                  editable={false}
                  onChangeText={setFinalizerFromText}
                />
                {!!finalizerFromText && false && (
                  <TouchableOpacity
                    style={{ marginLeft: 5 }}
                    onPress={() => {
                      setFinalizerFromText('');
                      setStakedFromNumber(0);
                      setTxidFrom('');
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
                      <RegText
                        style={{ color: colors.background, marginTop: -3 }}
                      >
                        x
                      </RegText>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              {!!stakedFromNumber && (
                <FadeText
                  style={{ marginLeft: 15, marginBottom: 5 }}
                >{`Staked: ${stakedFromNumber.toFixed(5)} ${info.currencyName}`}</FadeText>
              )}
            </View>
          </View>
          {false && (
            <ChevronDown
              onPress={() =>
                navigation.navigate(RouteEnum.Finalizers, {
                  setFinalizer: (f: string, s: number) => {
                    setFinalizerFromText(f);
                    setStakedFromNumber(s);
                    setTxidFrom('');
                  },
                  scope: 'my',
                  exclude: '',
                })
              }
              width={30}
              height={30}
              style={{ marginLeft: 5 }}
              color={colors.text}
            />
          )}
        </View>

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
            <FontAwesomeIcon icon={faArrowDown} size={25} color={colors.text} />
          </View>
        </View>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate(RouteEnum.Finalizers, {
              setFinalizer: (f: string, s: number) => {
                setFinalizerToText(f);
                setStakedToNumber(s);
              },
              scope: 'network',
              exclude: finalizerFromText,
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
              marginTop: -15,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                flexGrow: 1,
                flexShrink: 1,
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
                  flexGrow: 1,
                  flexShrink: 1,
                  gap: 0,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={{
                      flexGrow: 1,
                      flexShrink: 1,
                      color: colors.text,
                      fontSize: 17,
                      fontWeight: '400',
                    }}
                    placeholder="Tap here for finalizer address"
                    placeholderTextColor={colors.placeholder}
                    value={finalizerToText}
                    editable={true}
                    onChangeText={setFinalizerToText}
                  />
                  {!!finalizerToText && (
                    <TouchableOpacity
                      style={{ marginLeft: 5 }}
                      onPress={() => {
                        setFinalizerToText('');
                        setStakedToNumber(0);
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
                        <RegText
                          style={{ color: colors.background, marginTop: -3 }}
                        >
                          x
                        </RegText>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
                {!!stakedToNumber && (
                  <FadeText
                    style={{ marginLeft: 15, marginBottom: 5 }}
                  >{`Voting power: ${stakedToNumber.toFixed(5)} ${info.currencyName}`}</FadeText>
                )}
              </View>
            </View>
            <ChevronDown
              width={30}
              height={30}
              style={{ marginLeft: 5, transform: [{ rotate: '-90deg' }] }}
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
            Bonds
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: colors.placeholder,
              marginBottom: 8,
            }}
          >
            Select the original staking transaction. The redelegate amount will
            be the value from that transaction.
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
            onPress={handleRedelegatePress}
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
                    Sending redelegate transaction…
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
                    Redelegate request transaction sent!
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
