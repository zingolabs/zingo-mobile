/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  ActivityIndicator,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronLeft,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import LiquidPrimaryButton from '../LiquidPrimaryButton';
import { ThemeType } from '../../../app/types/ThemeType';

type ModalState = 'idle' | 'sending' | 'success';

const AVAILABLE_BALANCE = 1.55; // TODO: Replace with real value

export function Unstake() {
  const navigation = useNavigation();
  const { colors } = useTheme() as unknown as ThemeType;
  const insets = useSafeAreaInsets();

  const [amountText, setAmountText] = useState('');
  const [modalState, setModalState] = useState<ModalState>('idle');

  const normalized = amountText.replace(',', '.');
  const amountNumber = parseFloat(normalized);
  const hasAmount = !isNaN(amountNumber) && amountNumber > 0;
  const withinBalance = hasAmount && amountNumber <= AVAILABLE_BALANCE;
  const isValidAmount = hasAmount && withinBalance;

  const modalVisible = modalState !== 'idle';

  const setHalf = () => {
    const half = AVAILABLE_BALANCE / 2;
    setAmountText(half.toString());
  };

  const setMax = () => {
    setAmountText(AVAILABLE_BALANCE.toString());
  };

  const mockSendUnstakeTx = async (amount: number) => {
    console.log('Mock sending UNSTAKE tx for amount:', amount);
    return new Promise<void>(resolve => setTimeout(resolve, 2000));
  };

  const handleUnstakePress = async () => {
    if (!isValidAmount) {
      return;
    }

    setModalState('sending');

    try {
      await mockSendUnstakeTx(amountNumber);
      setModalState('success');
    } catch (e) {
      console.warn('Unstake tx failed (mock):', e);
      setModalState('idle');
    }
  };

  const handleViewMovements = () => {
    setModalState('idle');
    navigation.goBack();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top,
        }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={18}
              color={colors.text}
            />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Unstake
          </Text>

          <View style={{ width: 32 }} />
        </View>

        <View
          style={{
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 24,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 8,
            }}
          >
            Amount
          </Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              borderRadius: 12,
              marginBottom: 10,
              backgroundColor: colors.secondary,
              width: '100%',
              minWidth: '50%',
              height: 44,
              alignItems: 'center',
              paddingHorizontal: 16,
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
              placeholder="0.00"
              placeholderTextColor={colors.placeholder}
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              value={amountText}
              onChangeText={setAmountText}
              maxLength={20}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={setHalf}
                style={[
                  styles.chip,
                  { backgroundColor: colors.border, opacity: 0.9 },
                ]}
              >
                <Text style={{ color: colors.text, fontSize: 13 }}>50%</Text>
              </Pressable>

              <Pressable
                onPress={setMax}
                style={[
                  styles.chip,
                  { backgroundColor: colors.border, opacity: 0.9 },
                ]}
              >
                <Text style={{ color: colors.text, fontSize: 13 }}>Max</Text>
              </Pressable>
            </View>

            <View style={{ flex: 1 }} />

            <Text
              style={{
                fontSize: 13,
                color: colors.placeholder,
              }}
            >
              Available for unstaking:{' '}
              <Text
                style={{
                  color: colors.text,
                  fontWeight: '500',
                }}
              >
                {AVAILABLE_BALANCE} cTAZ
              </Text>
            </Text>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 16,
            paddingTop: 8,
          }}
        >
          <LiquidPrimaryButton
            title="Unstake"
            disabled={!isValidAmount || modalState === 'sending'}
            onPress={handleUnstakePress}
            style={{ alignSelf: 'stretch' }}
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
                { backgroundColor: colors.card, borderColor: colors.border },
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
                    Unstaking transaction sent!
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
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
