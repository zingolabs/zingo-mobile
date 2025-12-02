/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronLeft,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { ThemeType } from '../../../app/types/ThemeType';
import LiquidPrimaryButton from '../LiquidPrimaryButton';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../../../app/types';
import { RouteEnum } from '../../../app/AppState';
import RegText from '../../Components/RegText';

const PRESET_AMOUNTS = [0.01, 0.1, 1, 10];

type ModalState = 'idle' | 'sending' | 'success';

type AddStakeScreenProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Stake>;

const AddStakeScreen: React.FC<AddStakeScreenProps> = () => {
  const navigation = useNavigation();
  const { colors } = useTheme() as unknown as ThemeType;
  const insets = useSafeAreaInsets();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [finalizerText, setFinalizerText] = useState('');
  const [addressText, setAddressText] = useState('');

  const hasSelection = selectedAmount !== null;
  const displayAmount = selectedAmount ?? 0;

  const modalVisible = modalState !== 'idle';

  const mockSendStakeTx = async (amount: number) => {
    // Here should go the usual balance checks, etc

    console.log('Mock sending stake tx for amount:', amount);
    return new Promise<void>(resolve => setTimeout(resolve, 2000));
  };

  const handleConfirmStake = async () => {
    if (!hasSelection) {
      return;
    }

    setModalState('sending');

    try {
      // TODO: Replace mock
      await mockSendStakeTx(selectedAmount!);

      setModalState('success');
    } catch (e) {
      // TODO: Handle error
      console.warn('Stake tx failed (mock):', e);
      setModalState('idle');
    }
  };

  const handleViewMovements = () => {
    setModalState('idle');
    navigation.goBack();
  };

  return (
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
          <FontAwesomeIcon icon={faChevronLeft} size={18} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Stake</Text>

        <View style={{ width: 32 }} />
      </View>

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
                    { color: isSelected ? colors.primary : colors.placeholder },
                  ]}
                >
                  cTAZ
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
            marginTop: 15
          }}
        >
          Finalizer address
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
            placeholder="Enter finalizer address"
            placeholderTextColor={colors.placeholder}
            keyboardType={'default'}
            value={finalizerText}
            onChangeText={setFinalizerText}
          />
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
                <RegText
                  style={{ color: colors.background, marginTop: -3 }}
                >
                  x
                </RegText>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            marginBottom: 8,
            marginTop: 5
          }}
        >
          Miner address
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
            placeholder="Enter miner address"
            placeholderTextColor={colors.placeholder}
            keyboardType={'default'}
            value={addressText}
            onChangeText={setAddressText}
          />
          {!!addressText && (
            <TouchableOpacity
              onPress={() => {
                setAddressText('');
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
      </View>

      {/* Bottom CTA */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 16,
          paddingTop: 8,
        }}
      >
        <LiquidPrimaryButton
          title="Stake"
          disabled={!hasSelection || modalState === 'sending'}
          onPress={handleConfirmStake}
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
    </View>
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