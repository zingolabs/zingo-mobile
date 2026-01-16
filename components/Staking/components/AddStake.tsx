/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  Alert,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { ThemeType } from '../../../app/types/ThemeType';
import LiquidPrimaryButton from '../LiquidPrimaryButton';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../../../app/types';
import {
  ChainNameEnum,
  RouteEnum,
  SendPageStateClass,
  ToAddrClass,
} from '../../../app/AppState';
import { StakingActionType } from '../../../app/AppState/types/ValueTransferType';
import { ContextAppLoaded } from '../../../app/context';
import Utils from '../../../app/utils';
import {
  MINER_ADDRESS_REGTEST,
  MINER_ADDRESS_TESTNET,
} from '../../../app/utils/constants';
import FadeText from '../../Components/FadeText';
import ZecAmount from '../../Components/ZecAmount';
import { HeaderTitle } from '../../Header';
import ChevronDown from '../../../assets/icons/chevron-down.svg';
import XIcon from '../../../assets/icons/x.svg';

const PRESET_AMOUNTS = [0.01, 0.1, 1, 10];

type ModalState = 'idle' | 'sending' | 'success';

type AddStakeScreenProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.Stake
> & {
  stakeTransaction: (
    sendPageState: SendPageStateClass,
    stakingAction: StakingActionType,
  ) => Promise<string>;
};

function reverseHexBytes(hex: string): string {
  if (hex.length !== 64) {
    throw new Error('Finalizer address must be 64 hex chars');
  }
  let out = '';
  for (let i = 0; i < 32; i++) {
    const byte = hex.slice(i * 2, i * 2 + 2);
    out = byte + out; // reverse byte order
  }
  return out.toLowerCase();
}

const AddStakeScreen: React.FC<AddStakeScreenProps> = ({
  stakeTransaction,
}) => {
  const navigation: any = useNavigation();
  const { colors } = useTheme() as unknown as ThemeType;
  const insets = useSafeAreaInsets();
  const { totalBalance, defaultUnifiedAddress, indexerServer, info, privacy } =
    useContext(ContextAppLoaded);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [finalizerText, setFinalizerText] = useState<string>('');
  const [kbOpen, setKbOpen] = useState<boolean>(false);
  const [spendable, setSpendable] = useState<number>(0);

  const hasSelection = selectedAmount !== null;
  const displayAmount = selectedAmount ?? 0;

  const modalVisible = modalState !== 'idle';

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  useEffect(() => {
    // Balance check (in cTAZ / ZEC units) 
    const _spendable =
      totalBalance && typeof totalBalance.totalSpendableBalance === 'number'
        ? totalBalance.totalSpendableBalance
        : 0;
    setSpendable(_spendable);
  }, [totalBalance, totalBalance?.totalSpendableBalance]);

  useEffect(() => {
    if (!finalizerText) {
      navigation.navigate(
        RouteEnum.Finalizers, 
        {
          setFinalizer: (f: string) => setFinalizerText(f),
          scope: 'network',
          exclude: '',
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirmStake = async () => {
    if (!hasSelection) {
      return;
    }

    const amount = selectedAmount!;
    const finalizer = finalizerText.trim();

    // Basic field checks
    if (!finalizer) {
      Alert.alert(
        'Finalizer required',
        'Please enter a finalizer address (hex).',
      );
      return;
    }

    // Optional: 32-byte hex (64 chars)
    const isHex32 = /^[0-9a-fA-F]{64}$/.test(finalizer);
    if (!isHex32) {
      Alert.alert(
        'Invalid finalizer',
        'Finalizer address must be 64 hex characters (32 bytes).',
      );
      return;
    }

    if (amount > spendable) {
      Alert.alert(
        'Insufficient balance',
        `You can stake up to ${spendable} cTAZ.`,
      );
      return;
    }
    // Build a minimal SendPageState to reuse existing plumbing
    const sendPageState = new SendPageStateClass(new ToAddrClass(0));

    sendPageState.toaddr.to =
      indexerServer.chainName === ChainNameEnum.regtestChainName
        ? MINER_ADDRESS_REGTEST
        : MINER_ADDRESS_TESTNET;
    sendPageState.toaddr.memo = defaultUnifiedAddress;
    sendPageState.toaddr.amount = Utils.parseNumberFloatToStringLocale(
      amount,
      8,
    );

    const stakingAction: StakingActionType = {
      kind: 'add',
      val: amount * 10 ** 8,
      target: reverseHexBytes(finalizer),
      source: '',
      insecureSourceName: '',
      insecureTargetName: '',
      // miner,
    };

    console.log('Staking action:', stakingAction);

    setModalState('sending');

    try {
      await stakeTransaction(sendPageState, stakingAction);
      setModalState('success');
    } catch (e) {
      console.warn('Stake tx failed:', e);
      Alert.alert('Error', 'Staking transaction failed. Please try again.');
      setModalState('idle');
    }
  };

  const handleViewMovements = () => {
    setModalState('idle');
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
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
          title="Stake"
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
            justifyContent: 'flex-start',
            borderRadius: 40,
            marginBottom: 10,
            backgroundColor: colors.secondary,
            height: 70,
            alignItems: 'center',
            paddingHorizontal: 16,
            marginHorizontal: 10,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              color: colors.text,
              fontSize: 17,
              fontWeight: '400',
              paddingVertical: 0,
            }}
            placeholder="Enter finalizer address"
            placeholderTextColor={colors.placeholder}
            keyboardType={'default'}
            value={finalizerText}
            onChangeText={setFinalizerText}
          />
          <TouchableOpacity
            onPress={() => 
              navigation.navigate(
                RouteEnum.Finalizers, 
                {
                  setFinalizer: (f: string) => setFinalizerText(f),
                  scope: 'network',
                  exclude: '',
                }
              )
            }
          >
            <ChevronDown
              width={30}
              height={30}
              style={{ marginHorizontal: 15 }}
              color={colors.text}
            />
          </TouchableOpacity>

          {!!finalizerText && (
            <TouchableOpacity
              onPress={() => {
                setFinalizerText('');
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
                <XIcon color={colors.background} width={20} height={20} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 10,
          }}
        >
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
            <View style={{ marginBottom: 32 }}>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '700',
                  textAlign: 'center',
                  color: hasSelection ? colors.text : colors.placeholder,
                }}
              >
                {displayAmount} cTAZ
              </Text>
            </View>

            <View style={styles.grid}>
              {PRESET_AMOUNTS.map(value => {
                const isSelected = selectedAmount === value;

                return (
                  <Pressable
                    key={value}
                    style={[
                      styles.pill,
                      isSelected && {
                        backgroundColor: '#1A1A1A',
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => setSelectedAmount(value)}
                  >
                    <Text
                      style={[
                        styles.pillAmount,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}
                    >
                      +{value}
                    </Text>
                    <Text
                      style={[
                        styles.pillLabel,
                        {
                          color: isSelected
                            ? colors.primary
                            : colors.placeholder,
                        },
                      ]}
                    >
                      cTAZ
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={{
                marginTop: 10,
                flexDirection: 'row',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <FadeText style={{ marginRight: 5 }}>
                Available for staking:
              </FadeText>
              <ZecAmount
                amtZec={spendable}
                size={15}
                currencyName={info.currencyName}
                privacy={privacy}
              />
            </View>

          </View>
        </ScrollView>

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
            title="Stake"
            disabled={
              !hasSelection || !finalizerText.trim() || modalState === 'sending'
            }
            onPress={async () => await handleConfirmStake()}
            style={{
              alignSelf: 'stretch',
            }}
          />
        </View>

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
                    Sending staking transaction…
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
                    Staking transaction sent!
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  pill: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#1C1C1E',
  },
  pillAmount: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  pillLabel: {
    fontSize: 12,
  },
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
});

export default AddStakeScreen;
