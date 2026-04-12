/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import LiquidPrimaryButton from '../Components/LiquidButton/LiquidPrimaryButton';
import { ThemeType } from '../../app/types';
import {
  RouteEnum,
  ScheduledActionType,
  SendPageStateClass,
  StakingActionKindEnum,
  StakingActionType,
  ToAddrClass,
} from '../../app/AppState';
import { AppDrawerParamList } from '../../app/types';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { ContextAppLoaded } from '../../app/context';
import { HeaderTitle } from '../Header';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import ScheduledActionsFileImpl from '../ScheduledActions/ScheduledActionsFileImpl';
import Utils from '../../app/utils';
import notifee from '@notifee/react-native';
import StakingDayBubble from '../Staking/StakingDayBubble';
import LinearGradient from 'react-native-linear-gradient';
import Zap from '../../assets/icons/zap.svg';
import Clipboard from '../../assets/icons/clipboard.svg';
import { formatSeconds } from '../../app/utils/Utils';
import { scheduleReminder } from '../Staking/components/scheduleReminder';

type ModalState = 'idle' | 'sending' | 'success';

const dimensions = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height,
};

type ScheduledActionDetailProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.ScheduledActionDetail
> & {
  stakeTransaction: (
    sendPageState: SendPageStateClass,
    stakingAction: StakingActionType,
  ) => Promise<string>;
  beginUnstakeTransaction: (txid: string) => Promise<string>;
  withdrawBondTransaction: (txid: string) => Promise<string>;
  redelegateTransaction: (txid: string, finalizer: string) => Promise<string>;
};

const ScheduledActionDetail: React.FC<ScheduledActionDetailProps> = ({
  stakeTransaction,
  beginUnstakeTransaction,
  withdrawBondTransaction,
  redelegateTransaction,
  route,
}) => {
  // if item.id is 0 means this screen is the
  // confirmation screen.
  const item =
    !!route.params && route.params.item !== undefined
      ? route.params.item
      : ({} as ScheduledActionType);

  const navigation: any = useNavigation();
  const { colors } = useTheme() as ThemeType;
  const insets = useSafeAreaInsets();

  const [modalState, setModalState] = useState<ModalState>('idle');
  const [confirm, setConfirm] = useState<boolean>(item.id === 0);
  const [kbOpen, setKbOpen] = useState(false);

  const modalVisible = modalState !== 'idle';

  const context = useContext(ContextAppLoaded);
  const {
    valueTransfers,
    stakingDay,
    setScheduledActions,
    info,
    walletBonds,
    timeToStakingDaySeconds: timeToStakingDay,
    scheduledActions,
  } = context;

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  useEffect(() => {
    setConfirm(item.id === 0);
  }, [item.id]);

  const handleCancelPress = async () => {
    const list = await ScheduledActionsFileImpl.removeAction(item.id);
    setScheduledActions(list);
    if (list.length === 0) {
      await notifee.cancelAllNotifications();
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleExecuteNowPress = async () => {
    const selectedKind = item.kind;
    const bondTxid = item.txid;

    if (item.kind !== StakingActionKindEnum.CreateBond) {
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
          valueTransfers?.filter(v => v.txid === bondTxid)[0].confirmations ||
          0;
        if (confirmations <= 0) {
          Alert.alert(
            'Error',
            'This bond is still processing, wait for confirmations.',
          );
          return;
        }
      }
    }

    console.log('bondTxid', bondTxid);
    console.log('selectedKind', selectedKind);

    // Build a minimal SendPageState to reuse existing plumbing
    const sendPageState = new SendPageStateClass(new ToAddrClass(0));

    sendPageState.toaddr.amount = Utils.parseNumberFloatToStringLocale(
      item.amount,
      8,
    );

    setModalState('sending');

    const stakingAction: StakingActionType = {
      kind: StakingActionKindEnum.CreateBond,
      val: item.amount,
      target: item.finalizer,
      unique_public_key: 'IGNORE THIS. RUST PUTS SOMETHING HERE',
    };

    try {
      if (selectedKind === StakingActionKindEnum.BeginUnbonding) {
        await beginUnstakeTransaction(bondTxid);
      } else if (selectedKind === StakingActionKindEnum.WithdrawBond) {
        await withdrawBondTransaction(bondTxid);
      } else if (selectedKind === StakingActionKindEnum.Move) {
        await redelegateTransaction(item.bondKey, item.finalizerTo);
      } else if (selectedKind === StakingActionKindEnum.CreateBond) {
        await stakeTransaction(sendPageState, stakingAction);
      } else {
        Alert.alert(
          'Error',
          `Unsupported selection kind: ${selectedKind ?? 'none'}`,
        );
        setModalState('idle');
        return;
      }

      if (scheduledActions.filter(sa => sa.txid === bondTxid).length > 0) {
        const list = await ScheduledActionsFileImpl.removeAction(
          scheduledActions.filter(sa => sa.txid === bondTxid)[0].id,
        );
        setScheduledActions(list);
        if (list.length === 0) {
          await notifee.cancelAllNotifications();
        }
      }

      setModalState('success');
    } catch (error: any) {
      console.warn('Unstaking tx failed:', error);
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

  const handleScheduleActionPress = async () => {
    setModalState('sending');

    const list = await ScheduledActionsFileImpl.addAction(item);
    setScheduledActions(list);
    await scheduleReminder({
      seconds: timeToStakingDay,
      numberActions: list.length,
    });

    setModalState('success');
  };

  const handleViewMovements = () => {
    setModalState('idle');
    if (navigation.canGoBack()) {
      navigation.goBack();
      if (confirm) {
        navigation.goBack();
      }
    }
  };

  const mainValue = formatSeconds(timeToStakingDay);

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
          title={
            item.kind === StakingActionKindEnum.CreateBond && !confirm
              ? 'Stake'
              : item.kind === StakingActionKindEnum.BeginUnbonding && !confirm
                ? 'Unstake'
                : item.kind === StakingActionKindEnum.WithdrawBond && !confirm
                  ? 'Withdraw'
                  : item.kind === StakingActionKindEnum.Move && !confirm
                    ? 'Redelegate'
                    : item.kind === StakingActionKindEnum.CreateBond && confirm
                      ? 'Confirm stake'
                      : item.kind === StakingActionKindEnum.BeginUnbonding &&
                          confirm
                        ? 'Confirm unstake'
                        : item.kind === StakingActionKindEnum.WithdrawBond &&
                            confirm
                          ? 'Confirm withdraw'
                          : item.kind === StakingActionKindEnum.Move && confirm
                            ? 'Confirm redelegate'
                            : ''
          }
          goBack={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
          ExtraComponent={<StakingDayBubble />}
        />

        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 15,
            marginTop: 5,
            alignSelf: 'center',
            marginHorizontal: 24,
          }}
        >
          {`${
            item.kind === StakingActionKindEnum.CreateBond && !confirm
              ? 'Staking action program list'
              : item.kind === StakingActionKindEnum.BeginUnbonding && !confirm
                ? 'Unstaking action program list'
                : item.kind === StakingActionKindEnum.WithdrawBond && !confirm
                  ? 'Withdrawing action program list'
                  : item.kind === StakingActionKindEnum.Move && !confirm
                    ? 'Redelegating action program list'
                    : item.kind === StakingActionKindEnum.CreateBond && confirm
                      ? 'Review your staking action'
                      : item.kind === StakingActionKindEnum.BeginUnbonding &&
                          confirm
                        ? 'Review your unstaking action'
                        : item.kind === StakingActionKindEnum.WithdrawBond &&
                            confirm
                          ? 'Review your Withdrawing action'
                          : item.kind === StakingActionKindEnum.Move && confirm
                            ? 'Review your Redelegating action'
                            : ''
          }`}
        </Text>

        <LinearGradient
          colors={[stakingDay ? '#002309' : '#553000', '#272727']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 100,
            marginTop: 20,
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
            paddingHorizontal: 15,
            paddingVertical: 8,
            marginHorizontal: 24,
          }}
        >
          {stakingDay ? (
            <Zap width={18} height={18} />
          ) : (
            <Clipboard width={18} height={18} />
          )}
          <RegText style={{ color: stakingDay ? '#00A82A' : '#FFA100' }}>
            {stakingDay
              ? 'Executes immediately'
              : `Staking day active in ${mainValue}`}
          </RegText>
        </LinearGradient>

        <View
          style={{
            borderRadius: 26,
            backgroundColor: colors.secondary,
            marginTop: 20,
            paddingVertical: 5,
            marginHorizontal: 24,
          }}
        >
          {item.finalizer && (
            <React.Fragment>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginVertical: 18,
                  marginHorizontal: 40,
                  width: '80%',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 15 }}>
                    <RegText>
                      {item.kind !== StakingActionKindEnum.Move
                        ? 'Finalizer'
                        : 'From'}
                    </RegText>
                  </View>
                  <Text
                    style={{
                      color: colors.placeholder,
                      fontSize: 16,
                      marginLeft: 5,
                    }}
                  >
                    {item.finalizer.length > (dimensions.width < 500 ? 10 : 20)
                      ? Utils.trimToSmall(
                          item.finalizer,
                          dimensions.width < 500 ? 5 : 10,
                        )
                      : item.finalizer}
                  </Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border }} />
            </React.Fragment>
          )}
          {item.finalizerTo && (
            <React.Fragment>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginVertical: 18,
                  marginHorizontal: 40,
                  width: '80%',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 15 }}>
                    <RegText>{'To'}</RegText>
                  </View>
                  <Text
                    style={{
                      color: colors.placeholder,
                      fontSize: 16,
                      marginLeft: 5,
                    }}
                  >
                    {item.finalizerTo.length >
                    (dimensions.width < 500 ? 10 : 20)
                      ? Utils.trimToSmall(
                          item.finalizerTo,
                          dimensions.width < 500 ? 5 : 10,
                        )
                      : item.finalizerTo}
                  </Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border }} />
            </React.Fragment>
          )}
          {item.amount && (
            <React.Fragment>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginVertical: 18,
                  marginHorizontal: 40,
                  width: '80%',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 15 }}>
                    <RegText>{'Amount'}</RegText>
                  </View>
                  <ZecAmount
                    amtZec={
                      item.txid &&
                      walletBonds.filter(wb => wb.txid === item.txid).length > 0
                        ? walletBonds.filter(wb => wb.txid === item.txid)[0]
                            .amount
                        : item.amount / 10 ** 8
                    }
                    size={14}
                    currencyName={info.currencyName}
                  />
                </View>
              </View>
            </React.Fragment>
          )}
        </View>

        {!stakingDay && confirm && (
          <RegText
            style={{
              color: '#FFA100',
              fontSize: 14,
              fontWeight: 400,
              paddingHorizontal: 24,
              marginTop: 20,
            }}
          >
            This action will be queued and exectuted automatically at the start
            of the next staking day.
          </RegText>
        )}

        {/* Bottom CTA */}
        {!confirm ? (
          <View
            style={{
              marginTop: 'auto',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 10,
              paddingBottom: 20,
              paddingHorizontal: 24,
              gap: 10,
              width: '100%',
            }}
          >
            <LiquidPrimaryButton
              tintColor={'#730303'}
              title={'Remove reminder'}
              onPress={handleCancelPress}
              style={{ width: stakingDay ? '50%' : '100%' }}
            />
            {stakingDay && (
              <LiquidPrimaryButton
                title={'Execute now'}
                onPress={handleExecuteNowPress}
                style={{ width: '50%' }}
              />
            )}
          </View>
        ) : (
          <View
            style={{
              marginTop: 'auto',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 10,
              paddingBottom: 20,
              paddingHorizontal: 24,
              gap: 10,
              width: '100%',
            }}
          >
            {stakingDay ? (
              <LiquidPrimaryButton
                title={'Confirm'}
                onPress={handleExecuteNowPress}
                style={{ width: '100%' }}
              />
            ) : (
              <LiquidPrimaryButton
                title={'Schedule action'}
                onPress={handleScheduleActionPress}
                style={{ width: '100%' }}
              />
            )}
          </View>
        )}

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
                    Processing Scheduled action…
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
                    Scheduled action request done!
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginTop: 24,
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

export default ScheduledActionDetail;
