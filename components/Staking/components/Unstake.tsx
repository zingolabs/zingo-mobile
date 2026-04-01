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
import { faCheckCircle, faCircle } from '@fortawesome/free-solid-svg-icons';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import { ThemeType } from '../../../app/types';
import { RouteEnum, WalletBondsType } from '../../../app/AppState';
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

type ModalState = 'idle' | 'sending' | 'success';

type UnstakeProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Unstake> & {
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
  const [stakedFromNumber, setStakedFromNumber] = useState<number>(stakedFrom);

  const [selectedTxid, setSelectedTxid] = useState<string>('');
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [kbOpen, setKbOpen] = useState(false);

  const modalVisible = modalState !== 'idle';

  const context = useContext(ContextAppLoaded);
  const { walletBonds, valueTransfers, staked, info, privacy } = context;

  console.log('FINALIZER', finalizerFromText);

  const movements = walletBonds
    .filter(b => {
      if (b.status === WalletBondsStatusEnum.Withdrawn) return false;
      if (!!finalizerFromText && b.finalizer === finalizerFromText) return true;
      // no finalizer selected, all bonds visible. Impossible case for now.
      return false;
    })
    .sort((a, b) => b.amount - a.amount);

  const selectedBond = movements.find(tx => tx.txid === selectedTxid);
  const hasSelectedTx = !!selectedBond;
  const hasFinalizerFrom = !!finalizerFromText;
  const isValidForm = hasSelectedTx && hasFinalizerFrom;

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

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

  const shortenTxid = (txid: string) => {
    if (txid.length <= 16) {
      return txid;
    }
    return `${txid.slice(0, 10)}…${txid.slice(-8)}`;
  };

  const handleUnstakePress = async () => {
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

    console.log('bondTxid', bondTxid);
    console.log('selectedKind', selectedKind);

    setModalState('sending');

    try {
      if (selectedKind === WalletBondsStatusEnum.Active) {
        await beginUnstakeTransaction(bondTxid);
      } else if (selectedKind === WalletBondsStatusEnum.Unbonding) {
        await withdrawBondTransaction(selectedBond.txid);
      } else {
        Alert.alert(
          'Error',
          `Unsupported selection kind: ${selectedKind ?? 'none'}`,
        );
        setModalState('idle');
        return;
      }

      setModalState('success');
    } catch (error: any) {
      console.warn('Unstaking tx failed:', error);
      setModalState('idle');
      if (JSON.stringify(error).toLowerCase().includes('window')) {
        navigation.navigate(RouteEnum.ComputingError, {
          error: `Transaction outside of staking window :(. Try again later.`,
        });
      } else if (
        JSON.stringify(error).toLowerCase().includes('staking action delay')
      ) {
        navigation.navigate(RouteEnum.ComputingError, {
          error: `Transaction outside of staking window :(. Try again later.`,
        });
      } else {
        navigation.navigate(RouteEnum.ComputingError, { error: `${error}` });
      }
    }
  };

  const actionVerb = useMemo(() => {
    const k = selectedBond?.status;

    if (k === WalletBondsStatusEnum.Unbonding) return 'Withdraw';

    return 'Unstake';
  }, [selectedBond]);

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
                  value={finalizerFromText}
                  editable={true}
                  onChangeText={setFinalizerFromText}
                />
                {!!finalizerFromText && (
                  <TouchableOpacity
                    style={{ marginLeft: 5 }}
                    onPress={() => {
                      setFinalizerFromText('');
                      setStakedFromNumber(0);
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
          <ChevronDown
            onPress={() =>
              navigation.navigate(RouteEnum.Finalizers, {
                setFinalizer: (f: string, s: number) => {
                  setFinalizerFromText(f);
                  setStakedFromNumber(s);
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
        </View>

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
            Staking positions
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: colors.placeholder,
              marginBottom: 8,
            }}
          >
            These are the currently-active delegation bonds, which includes
            bonded and unstaked positions.
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
                  You don&apos;t have any staking positions that match the
                  currently selected filters.
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
