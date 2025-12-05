/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import {
  ChainNameEnum,
  RouteEnum,
  SendPageStateClass,
  ToAddrClass,
  ValueTransferType,
} from '../../../app/AppState';
import { AppDrawerParamList } from '../../../app/types';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { ContextAppLoaded } from '../../../app/context';
import { StakingActionType } from '../../../app/AppState/types/ValueTransferType';
import Utils from '../../../app/utils';

type ModalState = 'idle' | 'sending' | 'success';

type UnstakeProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Unstake> & {
  stakeTransaction: (
    sendPageState: SendPageStateClass,
    stakingAction: StakingActionType,
  ) => Promise<string>;
};

const Unstake: React.FC<UnstakeProps> = ({ stakeTransaction }) => {
  const navigation = useNavigation();
  const { colors } = useTheme() as unknown as ThemeType;
  const insets = useSafeAreaInsets();

  const { RPCModule } = NativeModules as {
    RPCModule: {
      // Promise resolves to a string (either "Error: ..." or the u64 value in zats)
      getAccumulatedStakeForTxidInfo(txid: string): Promise<string>;
    };
  };

  const [selectedTxid, setSelectedTxid] = useState<string>('');
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [kbOpen, setKbOpen] = useState(false);

  // txid -> zats as string (from native)
  const [accumulatedStakeByTxid, setAccumulatedStakeByTxid] = useState<
    Record<string, string>
  >({});

  const modalVisible = modalState !== 'idle';

  const context = useContext(ContextAppLoaded);
  const { valueTransfers, indexerServer } = context;

  const movements: ValueTransferType[] = useMemo(() => {
    if (!valueTransfers) {
      return [];
    }

    // All staking "add" actions
    const stakingAdds = valueTransfers.filter(
      (vt: ValueTransferType) =>
        vt.stakingAction !== null && vt.stakingAction.kind === 'add',
    );

    // All txids that have been used as a source in a "sub" (unstake) action
    const unstakeSources = new Set(
      valueTransfers
        .filter(
          (vt: ValueTransferType) =>
            vt.stakingAction !== null &&
            vt.stakingAction.kind === 'sub' &&
            !!vt.stakingAction.source,
        )
        .map(vt => vt.stakingAction!.source),
    );

    // Keep only adds whose txid is NOT present as a source in any "sub"
    return stakingAdds.filter(vt => !unstakeSources.has(vt.txid));
  }, [valueTransfers]);

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

  const getAccumulatedStakeZatsForTxid = (txid: string): number | null => {
    const zatsStr = accumulatedStakeByTxid[txid];
    if (!zatsStr) {
      return null;
    }
    const zats = Number(zatsStr);
    if (Number.isNaN(zats)) {
      return null;
    }
    return zats;
  };

  const handleUnstakePress = async () => {
    if (!isValidForm || !selectedTx) {
      return;
    }

    const zats = getAccumulatedStakeZatsForTxid(selectedTx.txid);
    if (zats === null) {
      Alert.alert(
        'Unstake amount not ready',
        'Could not determine the remaining staked amount for this transaction yet. Please wait a moment and try again.',
      );
      return;
    }

    if (zats <= 0) {
      Alert.alert(
        'Invalid unstake amount',
        'The remaining staked amount for this transaction is invalid or zero.',
      );
      return;
    }

    setModalState('sending');

    let miner_address_testnet =
      'utest14wa0pcf7uusm364sz8ewd0kg5x7fud4nmph6nm55f300l658nmaa0tstc6hssfnn44gw90utujn4wsrl7u6kuvel6yya8muzgcz6tyz9';

    let miner_address_regtest =
      'uregtest16k405smwvsuvfhfmmwa84qgztgh2d2mehzv7dz48vff8vlppn58wnpd0syt5ys7ldlgep4x0t3d5v2x65uafvah2z85pxh6sg5jq8lgp';

    let memo = `@UNSTAKE_RECEIVE: ${selectedTx.txid}\nThanks for staking!`;

    const sendPageState = new SendPageStateClass(new ToAddrClass(0));
    sendPageState.toaddr.to =
      indexerServer.chainName === ChainNameEnum.regtestChainName
        ? miner_address_regtest
        : miner_address_testnet;
    sendPageState.toaddr.memo = memo;
    // 0-value tx; the staking action captures the amount in zats
    sendPageState.toaddr.amount = Utils.parseNumberFloatToStringLocale(0, 8);

    const stakingAction: StakingActionType = {
      kind: 'sub',
      // use the backend value (zats) directly
      val: zats,
      target:
        (selectedTx.stakingAction && selectedTx.stakingAction?.target) || '',
      source: selectedTx.txid,
      insecureSourceName: '',
      insecureTargetName: '',
    };

    console.log('Unstaking action:', stakingAction);

    try {
      await stakeTransaction(sendPageState, stakingAction);
      setModalState('success');
    } catch (e) {
      console.warn('Unstake tx failed:', e);
      Alert.alert('Error', 'Staking transaction failed. Please try again.');
      setModalState('idle');
    }
  };

  const handleViewMovements = () => {
    setModalState('idle');
    navigation.goBack();
  };

  const renderSeparator = () => <View style={{ height: 8 }} />;

  const renderStakedTxItem = ({ item }: { item: ValueTransferType }) => {
    const isSelected = item.txid === selectedTxid;

    const zats = getAccumulatedStakeZatsForTxid(item.txid);
    let displayAmount = String(item.amount);

    if (zats !== null) {
      const amountInCoin = zats / 10 ** 8;
      displayAmount = Utils.parseNumberFloatToStringLocale(amountInCoin, 8);
    }

    return (
      <Pressable
        onPress={() => setSelectedTxid(item.txid)}
        style={[
          styles.txRow,
          {
            borderColor: isSelected ? colors.primary : colors.border,
            backgroundColor: isSelected ? colors.secondary : colors.card,
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
        {/* Header */}
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
                  const zats = getAccumulatedStakeZatsForTxid(selectedTx.txid);
                  if (zats === null) {
                    return `${selectedTx.amount} cTAZ`;
                  }
                  const amountInCoin = zats / 10 ** 8;
                  return `${Utils.parseNumberFloatToStringLocale(
                    amountInCoin,
                    8,
                  )} cTAZ`;
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
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

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
