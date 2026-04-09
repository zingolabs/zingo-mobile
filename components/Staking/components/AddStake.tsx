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
import { faCheckCircle, faCircle } from '@fortawesome/free-solid-svg-icons';
import { ThemeType } from '../../../app/types';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../../../app/types';
import {
  RouteEnum,
  ScheduledActionType,
  SendPageStateClass,
  StakingActionKindEnum,
  ToAddrClass,
} from '../../../app/AppState';
import { StakingActionType } from '../../../app/AppState';
import { ContextAppLoaded } from '../../../app/context';
import Utils from '../../../app/utils';
import FadeText from '../../Components/FadeText';
import ZecAmount from '../../Components/ZecAmount';
import { HeaderTitle } from '../../Header';
import ChevronDown from '../../../assets/icons/chevron-down.svg';
import RegText from '../../Components/RegText';
import ScheduledActionsFileImpl from '../../ScheduledActions/ScheduledActionsFileImpl';
import { scheduleReminder } from './scheduleReminder';

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

const AddStakeScreen: React.FC<AddStakeScreenProps> = ({
  stakeTransaction,
}) => {
  const navigation: any = useNavigation();
  const { colors } = useTheme() as ThemeType;
  const insets = useSafeAreaInsets();
  const {
    totalBalance,
    info,
    privacy,
    globalStaked,
    stakingDay,
    setScheduledActions,
    scheduledActions,
    timeToStakingDaySeconds: timeToStakingDay,
  } = useContext(ContextAppLoaded);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [finalizerText, setFinalizerText] = useState<string>('');
  const [stakedNumber, setStakedNumber] = useState<number>(0);
  const [kbOpen, setKbOpen] = useState<boolean>(false);
  const [spendable, setSpendable] = useState<number>(0);

  const hasSelection = selectedAmount !== null;

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
    // looking for the voting power of the finalizer.
    if (globalStaked.filter(g => g.finalizer === finalizerText).length === 1) {
      setStakedNumber(
        globalStaked.filter(g => g.finalizer === finalizerText)[0].votingPower,
      );
    } else {
      setStakedNumber(0);
    }
  }, [finalizerText, globalStaked]);

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
        `You can stake up to ${spendable.toFixed(5)} ${info.currencyName}.`,
      );
      return;
    }

    if (!stakingDay) {
      const amountScheduled = scheduledActions
        .filter(sa => sa.kind === StakingActionKindEnum.CreateBond)
        .reduce((acc, curr) => acc + curr.amount, 0);
      if (amount + amountScheduled / 10 ** 8 > spendable) {
        Alert.alert(
          'Insufficient balance to schedule a staking action',
          `You can schedule stakes up to ${spendable.toFixed(5)} ${info.currencyName}.`,
        );
        return;
      }
    }

    // Build a minimal SendPageState to reuse existing plumbing
    const sendPageState = new SendPageStateClass(new ToAddrClass(0));

    sendPageState.toaddr.amount = Utils.parseNumberFloatToStringLocale(
      amount,
      8,
    );

    setModalState('sending');

    const stakingAction: StakingActionType = {
      kind: StakingActionKindEnum.CreateBond,
      val: amount * 10 ** 8,
      target: finalizer,
      unique_public_key: 'IGNORE THIS. RUST PUTS SOMETHING HERE',
    };

    const TITLE = 'Your staking action is ready to be executed!';
    const BODY = 'TODO: Action details';

    // testing... remove it for production.
    //Alert.alert('TESTING', 'in 60 seconds you will have a notification');
    //await scheduleReminder({ seconds: 60, title: TITLE, body: BODY });

    try {
      if (stakingDay) {
        await stakeTransaction(sendPageState, stakingAction);
      } else {
        const notifeeId = await scheduleReminder({
          seconds: timeToStakingDay,
          title: TITLE,
          body: BODY,
        });
        const stakingScheduledAction: ScheduledActionType = {
          id: 0,
          kind: StakingActionKindEnum.CreateBond,
          amount: amount * 10 ** 8,
          finalizer: finalizer,
          finalizerTo: '',
          txid: '',
          bondKey: '',
          notifeeId: notifeeId ? notifeeId : '',
          title: TITLE,
          body: BODY,
        };
        const list = await ScheduledActionsFileImpl.addSA(
          stakingScheduledAction,
        );
        setScheduledActions(list);
      }
      setModalState('success');
    } catch (error: any) {
      console.warn('Stake tx failed:', error);
      setModalState('idle');
      if (JSON.stringify(error).toLowerCase().includes('window')) {
        navigation.navigate(RouteEnum.ComputingError, {
          error: `Transaction outside of staking window.`,
        });
      } else if (
        JSON.stringify(error).toLowerCase().includes('staking action delay')
      ) {
        navigation.navigate(RouteEnum.ComputingError, {
          error: `Cannot operate on the same staking action in the same window.`,
        });
      } else {
        navigation.navigate(RouteEnum.ComputingError, { error: `${error}` });
      }
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
                  value={finalizerText}
                  editable={true}
                  onChangeText={setFinalizerText}
                />
                {!!finalizerText && (
                  <TouchableOpacity
                    style={{ marginLeft: 5 }}
                    onPress={() => {
                      setFinalizerText('');
                      setStakedNumber(0);
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
              {!!stakedNumber && (
                <FadeText
                  style={{ marginLeft: 15, marginBottom: 5 }}
                >{`Voting power: ${stakedNumber.toFixed(5)} ${info.currencyName}`}</FadeText>
              )}
            </View>
          </View>
          <ChevronDown
            onPress={() =>
              navigation.navigate(RouteEnum.Finalizers, {
                setFinalizer: (f: string, s: number) => {
                  setFinalizerText(f);
                  setStakedNumber(s);
                },
                scope: 'network',
                exclude: '',
              })
            }
            width={30}
            height={30}
            style={{ marginLeft: 5 }}
            color={colors.text}
          />
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
              <ZecAmount
                style={{
                  alignSelf: 'center',
                }}
                size={36}
                currencyName={info.currencyName}
                color={hasSelection ? colors.text : colors.placeholder}
                amtZec={selectedAmount ?? 0}
                privacy={privacy}
              />
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
                      {info.currencyName}
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
            style={{
              width: '100%',
            }}
            title="Stake"
            disabled={
              !hasSelection || !finalizerText.trim() || modalState === 'sending'
            }
            onPress={async () => await handleConfirmStake()}
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

                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingTop: 24,
                      paddingBottom: 20,
                      paddingHorizontal: 24,
                    }}
                  >
                    <LiquidPrimaryButton
                      title="View movements"
                      onPress={handleViewMovements}
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
