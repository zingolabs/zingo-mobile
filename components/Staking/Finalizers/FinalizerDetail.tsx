/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableWithoutFeedback,
  View,
  Modal,
  Keyboard,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { useNavigation, useTheme } from '@react-navigation/native';

import { AppDrawerParamList, ThemeType } from '../../../app/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../../Header';
import { FinalizerCard } from './FinalizerCard';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';
import { RouteEnum, WalletBondsType } from '../../../app/AppState';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { WalletBondsStatusEnum } from '../../../app/AppState/enums/WalletBondsStatusEnum';
import { ContextAppLoaded } from '../../../app/context';
import { FinalizerPosition } from './FinalizerPosition';
import { DrawerScreenProps } from '@react-navigation/drawer';
import StakingDayBubble from '../StakingDayBubble';

type ModalState = 'idle' | 'sending' | 'success';

type FinalizerDetailProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.FinalizerDetail
>;

export function FinalizerDetail({ route }: FinalizerDetailProps) {
  const finalizer =
    !!route.params && route.params.finalizer !== undefined
      ? route.params.finalizer
      : null;

  const lifehash =
    !!route.params && route.params.lifehash !== undefined
      ? route.params.lifehash
      : null;

  const navigation: any = useNavigation();
  const { colors } = useTheme() as ThemeType;
  const insets = useSafeAreaInsets();

  const [finalizerFromText] = useState<string | null>(finalizer);
  const [, setStakedFromNumber] = useState<number>(1);

  const [modalState, setModalState] = useState<ModalState>('idle');
  const [kbOpen, setKbOpen] = useState(false);

  const modalVisible = modalState !== 'idle';

  const context = useContext(ContextAppLoaded);
  const { walletBonds, staked, globalStaked } = context;

  console.log('FINALIZER', finalizer);

  const movements = walletBonds
    .filter(b => {
      if (b.status === WalletBondsStatusEnum.Withdrawn) return false;
      if (!!finalizerFromText && b.finalizer === finalizerFromText) return true;
      // no finalizer selected, all bonds visible. Impossible case for now.
      if (!finalizerFromText) return false;
    })
    .sort((a, b) => b.amount - a.amount);

  const totalStakedFinalizer =
    globalStaked.filter(g => g.finalizer === finalizerFromText).length > 0
      ? globalStaked.filter(g => g.finalizer === finalizerFromText)[0]
          .votingPower
      : 0;

  const totalUserStaked = walletBonds
    .filter(wb => wb.finalizer === finalizerFromText)
    .map(b => {
      return b.amount;
    })
    .reduce((a, b) => a + b, 0);

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

  const handleViewMovements = () => {
    setModalState('idle');
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const renderSeparator = () => <View style={{ height: 8 }} />;

  const renderStakedTxItem = ({ item }: { item: WalletBondsType }) => {
    return (
      <FinalizerPosition
        bond={item}
        onPresWithdraw={() => {
          navigation.navigate(RouteEnum.Unstake, {
            finalizer: item.finalizer,
            txid: item.txid,
            staked: item.amount,
          });
        }}
        onPressRedelegate={() => {
          navigation.navigate(RouteEnum.Redelegate, {
            finalizer: item.finalizer,
            txid: item.txid,
            staked: item.amount,
          });
        }}
        onPressUnstake={() => {
          navigation.navigate(RouteEnum.Unstake, {
            finalizer: item.finalizer,
            txid: item.txid,
            staked: item.amount,
          });
        }}
      />
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          gap: 20,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? insets.top : kbOpen ? insets.top : 0
        }
      >
        <HeaderTitle
          title="Finalizer Details"
          goBack={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
          ExtraComponent={<StakingDayBubble />}
        />

        <FinalizerCard
          containerStyle={{
            marginHorizontal: 20,
          }}
          lifehash={lifehash || ''}
          finalizerId={finalizer || ''}
          userStake={totalUserStaked}
          totalStake={totalStakedFinalizer}
        />

        {/* Content */}
        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
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
}

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
