/* eslint-disable react-native/no-inline-styles */
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import Animated from 'react-native-reanimated';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Linking, Pressable, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radiusMd, space12, space8, useTheme } from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import {
  Route,
  SnackbarDurationEnum,
  ValueTransferKindEnum,
} from '@app/AppState';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import { useUnfold } from '@app/hooks/useUnfold';
import { ContextAppLoaded, useSwapRecords, useSwapService } from '@app/context';
import {
  SwapDirectionEnum,
  SwapStore,
  buildChainExplorerUrl,
  canonicalChainAddress,
  canRemoveSwap,
  formatAmountForDisplay,
  isPrePaymentStatus,
  isRealLegHash,
  isTerminalStatus,
  providerLongLabel,
} from '@app/swap';
import { showConfirm } from '@app/services/showConfirm';
import Utils from '@app/utils';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import TextField from '@ui/primitives/TextField';
import { SwapIcon } from '@ui/primitives/Icons/SwapIcon';
import { ClockIcon } from '@ui/primitives/Icons/ClockIcon';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from '@ui/primitives/Icons/Chevron';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import DepositSlip from '@screens/Swap/components/DepositSlip';
import DetailHero from '@screens/Swap/components/DetailHero';
import DetailRows from '@screens/Swap/components/DetailRows';
import type { DetailRow } from '@screens/Swap/components/DetailRows';
import ShieldNote from '@screens/Swap/components/ShieldNote';
import SaveContactSheet from '@screens/Swap/components/SaveContactSheet';
import ContactInitial from '@screens/Swap/components/ContactInitial';
import { InfoTipHost } from '@ui/widgets/InfoTip';
import { UserPlusIcon } from '@ui/primitives/Icons/UserPlusIcon';
import { useSwapRecord } from '@screens/Swap/useSwapRecord';
import { swapOutcome } from '@screens/Swap/swapProgress';
import { legName, legsOf } from '@screens/Swap/swapLegs';

type SwapDetailProps = NativeStackScreenProps<
  AppDrawerParamList,
  typeof Route.SwapDetail
>;

/**
 * A swap's record. The top says what happened and what it got; the rows
 * say when, through whom, for how much and where; its Zcash transactions
 * fold under "Transactions", each opening its own detail. A deposit still
 * unpaid shows its slip first, the one thing left to do.
 */
const SwapDetail: React.FunctionComponent<SwapDetailProps> = ({
  navigation,
  route,
}) => {
  const { recordId } = route.params;
  const {
    translate,
    language,
    walletChainName,
    blockExplorer,
    valueTransfers,
    info,
    addressBook,
    setAddressBook,
    addLastSnackbar,
  } = useContext(ContextAppLoaded);
  const saveSheetRef = useRef<BottomSheetModal>(null);
  const { colors } = useTheme();
  const swapService = useSwapService();
  const records = useSwapRecords();
  const record = useSwapRecord(recordId);
  const [legsOpen, setLegsOpen] = useState<boolean>(false);
  const [hash, setHash] = useState<string>('');
  const [attaching, setAttaching] = useState<boolean>(false);
  const [attachError, setAttachError] = useState<string>('');
  const t = (key: string) => (translate(key) as string).trim();

  // A finished swap is no longer polled, so one that finished before the
  // tracker kept some detail is asked about once, here.
  useEffect(() => {
    if (!swapService) {
      return;
    }
    swapService
      .backfillFinishedRecord(recordId)
      .catch(err =>
        console.log(`SwapDetail: backfill failed for ${recordId}: ${err}`),
      );
  }, [swapService, recordId]);

  const close = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const attach = useCallback(async () => {
    const trimmed = hash.trim();
    if (!trimmed || !swapService || !record) {
      return;
    }
    setAttaching(true);
    setAttachError('');
    try {
      if (record.direction === SwapDirectionEnum.Outbound) {
        await swapService.markBroadcasted({ recordId, txId: trimmed });
      } else {
        await swapService.setObservedDepositTxHash({ recordId, hash: trimmed });
      }
      setHash('');
    } catch (e) {
      setAttachError(`${e}`);
    } finally {
      setAttaching(false);
    }
  }, [hash, swapService, record, recordId]);

  const remove = useCallback(() => {
    if (!record) {
      return;
    }
    showConfirm({
      title: t('swap.detail-remove-title'),
      message: t(
        isPrePaymentStatus(record.status)
          ? 'swap.detail-remove-unpaid'
          : 'swap.detail-remove-body',
      ),
      buttons: [
        { text: t('swap.close'), style: 'cancel' },
        {
          text: t('swap.detail-remove'),
          style: 'destructive',
          onPress: () => {
            SwapStore.deleteByRecordId(recordId).then(close);
          },
        },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, recordId, close]);

  if (!record) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  const sell = record.direction === SwapDirectionEnum.Outbound;
  const outcome = swapOutcome(record.status);
  const done = outcome === 'completed';
  const sellSym = record.sellAsset.ticker ?? record.sellAsset.symbol;
  const getSym = record.receiveAsset.ticker ?? record.receiveAsset.symbol;
  const other = sell ? record.receiveAsset : record.sellAsset;
  const otherSym = sell ? getSym : sellSym;
  const got = record.actualReceiveAmount ?? record.expectedReceiveAmount;
  const back = record.refundInfo?.refundedAmountText;
  const usd = (amount: string, unit: number) => {
    const v = parseFloat(amount) * unit;
    return unit > 0 && Number.isFinite(v) ? `≈ $${v.toFixed(2)}` : '';
  };

  const title = `${t(sell ? 'history.swap-to' : 'history.swap-from')} ${otherSym}`;
  const hero =
    outcome === 'refunded'
      ? {
          amount:
            back !== undefined
              ? `−${formatAmountForDisplay((parseFloat(record.sellAmountHumanDecimal) - parseFloat(back)).toFixed(8))}`
              : formatAmountForDisplay(record.sellAmountHumanDecimal),
          unit: sellSym,
          tone: 'default' as const,
          line:
            back !== undefined
              ? `${formatAmountForDisplay(back)} ${t('swap.detail-of')} ${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${sellSym} ${t('swap.detail-came-back')}`
              : '',
        }
      : {
          amount: `${done ? '+' : '≈ +'}${formatAmountForDisplay(got)}`,
          unit: getSym,
          tone: done ? ('positive' as const) : ('default' as const),
          line: `−${formatAmountForDisplay(record.sellAmountHumanDecimal)} ${sellSym}${usd(got, record.fiatValueBasis.receiveUsdUnitPrice) ? ` · ${usd(got, record.fiatValueBasis.receiveUsdUnitPrice)}` : ''}`,
        };
  const pill =
    outcome === 'completed'
      ? { text: t('swap.history-done'), tone: 'accent' as const }
      : outcome === 'refunded'
        ? { text: t('swap.history-refunded'), tone: 'warning' as const }
        : outcome === 'failed' || outcome === 'expired'
          ? { text: t('swap.history-failed'), tone: 'danger' as const }
          : { text: t('swap.history-in-progress'), tone: 'neutral' as const };

  const feesUsd =
    record.totalFeesInReceiveAsset &&
    record.fiatValueBasis.receiveUsdUnitPrice > 0
      ? usd(
          record.totalFeesInReceiveAsset,
          record.fiatValueBasis.receiveUsdUnitPrice,
        ).replace('≈ ', '')
      : record.totalFeesInReceiveAsset
        ? `${formatAmountForDisplay(record.totalFeesInReceiveAsset)} ${getSym}`
        : '';
  const reason = record.refundInfo?.refundReason ?? record.failureReason;
  /** The contact a finished sale reached, when its address is saved. */
  const contact =
    done && sell
      ? addressBook.find(
          c =>
            c.swapChain.toUpperCase() ===
              record.receiveAsset.chain.toUpperCase() &&
            c.address ===
              canonicalChainAddress(
                record.receiveAsset.chain,
                record.destinationAddress,
              ),
        )
      : undefined;
  const rows: DetailRow[] = [
    {
      label: t('swap.detail-date'),
      value: Utils.formatDate(
        record.createdAtMs,
        'MMM d, yyyy · h:mm aaa',
        language,
      ),
    },
    { label: t('swap.provider'), value: providerLongLabel(record.provider) },
    ...(feesUsd ? [{ label: t('swap.review-fees'), value: feesUsd }] : []),
    ...(done && sell
      ? [
          {
            label: t('swap.detail-sent-to'),
            value: contact
              ? `${contact.label}  ${Utils.trimToSmall(record.destinationAddress, 4)}`
              : Utils.trimToSmall(record.destinationAddress, 6),
            copy: record.destinationAddress,
            leading: contact ? (
              <ContactInitial
                name={contact.label}
                color={contact.color}
                size={24}
              />
            ) : undefined,
          },
        ]
      : []),
    ...(!done && reason
      ? [{ label: t('swap.result-reason'), value: reason, wrap: true }]
      : []),
  ];

  const hasDepositEvidence =
    isRealLegHash(record.broadcast?.txId) ||
    isRealLegHash(record.observedDepositTxHash);
  const awaitingDeposit =
    !isTerminalStatus(record.status) && !hasDepositEvidence;
  const legs = legsOf(records, valueTransfers ?? [], recordId);
  const receivedTransparent = legs.some(
    l => l.kind === ValueTransferKindEnum.Received,
  );

  const explorerHash = isRealLegHash(record.broadcast?.txId)
    ? { chain: record.sellAsset.chain, hash: record.broadcast?.txId as string }
    : isRealLegHash(record.destinationTxHash)
      ? {
          chain: record.receiveAsset.chain,
          hash: record.destinationTxHash as string,
        }
      : isRealLegHash(record.observedDepositTxHash)
        ? {
            chain: record.sellAsset.chain,
            hash: record.observedDepositTxHash as string,
          }
        : undefined;
  const explorerUrl = explorerHash
    ? buildChainExplorerUrl({
        chain: explorerHash.chain,
        hash: explorerHash.hash,
        zecChainName: walletChainName,
        zecBlockExplorer: blockExplorer,
      })
    : null;
  const LegsChevron = legsOpen ? ChevronUp : ChevronDown;

  return (
    <InfoTipHost>
      <SwapFlowScreen
        testID="swap.detail"
        title={t('swap.detail-title')}
        onBack={close}
        footer={
          <ButtonStack>
            {canRemoveSwap(record.status) && (
              <Button
                testID="swap.detail.remove"
                variant="quiet"
                title={t('swap.detail-remove')}
                onPress={remove}
              />
            )}
            {!!explorerUrl && (
              <Button
                testID="swap.detail.explorer"
                variant="text"
                title={t('swap.detail-explorer')}
                onPress={() => Linking.openURL(explorerUrl)}
              />
            )}
          </ButtonStack>
        }
      >
        <DetailHero
          icon={
            isTerminalStatus(record.status) ? (
              <SwapIcon size={18} color={colors.fgDefault} />
            ) : (
              <ClockIcon size={18} color={colors.fgDefault} />
            )
          }
          badge={other}
          title={title}
          amount={hero.amount}
          unit={hero.unit}
          tone={hero.tone}
          line={hero.line}
          pill={pill.text}
          pillTone={pill.tone}
        />

        {awaitingDeposit && (
          <View style={{ marginVertical: space12, rowGap: space12 }}>
            <Text variant="bodyStrong">
              {t(sell ? 'swap.deposit-unsent-title' : 'swap.deposit-title')}
            </Text>
            <DepositSlip record={record} paid={sell} />
            <Text variant="bodySmall" tone="muted">
              {t(
                sell
                  ? 'swap.deposit-paid-elsewhere'
                  : 'swap.deposit-already-paid',
              )}
            </Text>
            <TextField
              testID="swap.detail.hash"
              label={t('swap.deposit-hash')}
              value={hash}
              onChangeText={setHash}
              placeholder={t('swap.deposit-hash-placeholder')}
              mono
              error={attachError || undefined}
              trailingLabel={t('swap.paste')}
              onTrailingPress={async () =>
                setHash((await Clipboard.getString()).trim())
              }
            />
            <Button
              inline
              variant="text"
              title={t('swap.deposit-follow')}
              disabled={attaching || hash.trim().length === 0}
              busy={attaching}
              onPress={attach}
            />
          </View>
        )}

        <DetailRows rows={rows} />

        {done && sell && !contact && (
          <Pressable
            testID="swap.detail.save-contact"
            accessibilityRole="button"
            onPress={() => saveSheetRef.current?.present()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              columnGap: space8,
              minHeight: 44,
              marginTop: space8,
            }}
          >
            <UserPlusIcon size={18} color={colors.fgPriceUp} />
            <Text
              variant="caption"
              style={{ fontWeight: '700', color: colors.fgPriceUp }}
            >
              {t('swap.detail-save-contact').replace('{coin}', getSym)}
            </Text>
          </Pressable>
        )}

        {legs.length > 0 && (
          <View style={{ marginTop: space12 }}>
            <Pressable
              testID="swap.detail.legs"
              accessibilityRole="button"
              accessibilityState={{ expanded: legsOpen }}
              onPress={() => setLegsOpen(open => !open)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 11,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  columnGap: 8,
                }}
              >
                <Text variant="bodySmall" tone={legsOpen ? 'default' : 'muted'}>
                  {t('swap.detail-transactions')}
                </Text>
                <View
                  style={{
                    minWidth: 20,
                    paddingHorizontal: 6,
                    borderRadius: 10,
                    backgroundColor: colors.bgMutedSubtle,
                    alignItems: 'center',
                  }}
                >
                  <Text variant="caption" tone="muted">
                    {String(legs.length)}
                  </Text>
                </View>
              </View>
              <LegsChevron size={15} color={colors.fgMuted} />
            </Pressable>
            {legsOpen && (
              <LegsCard>
                {legs.map((leg, index) => {
                  const received = leg.kind === ValueTransferKindEnum.Received;
                  return (
                    <Pressable
                      key={`${leg.txid}:${leg.kind}`}
                      testID={`swap.detail.leg.${index}`}
                      accessibilityRole="button"
                      onPress={() =>
                        navigation.navigate(Route.SwapTransaction, {
                          recordId,
                          txid: leg.txid,
                          kind: leg.kind,
                        })
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        columnGap: space12,
                        minHeight: 44,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: colors.borderSubtle,
                      }}
                    >
                      <View style={{ flexShrink: 1 }}>
                        <Text variant="bodyStrong" style={{ fontSize: 13 }}>
                          {legName(leg, record, t)}
                        </Text>
                        <Text variant="caption" tone="muted">
                          {Utils.formatDate(
                            leg.time * 1000,
                            'MMM d, h:mm aaa',
                            language,
                          )}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          columnGap: space8,
                        }}
                      >
                        <Text
                          variant="bodyStrong"
                          style={{
                            color: received
                              ? colors.fgPriceUp
                              : colors.fgDefault,
                          }}
                        >
                          {`${received ? '+' : '−'}${leg.amount.toFixed(4)} ${info.currencyName}`}
                        </Text>
                        <ChevronRight size={16} color={colors.fgMuted} />
                      </View>
                    </Pressable>
                  );
                })}
              </LegsCard>
            )}
          </View>
        )}

        {receivedTransparent && (
          <View style={{ marginTop: space12 }}>
            <ShieldNote text={t('swap.shield-note')} />
          </View>
        )}
        {done && sell && (
          <SaveContactSheet
            ref={saveSheetRef}
            address={canonicalChainAddress(
              record.receiveAsset.chain,
              record.destinationAddress,
            )}
            chain={record.receiveAsset.chain}
            book={addressBook}
            onSave={async name => {
              setAddressBook(
                await AddressBookFileImpl.saveChainContact(
                  name,
                  record.destinationAddress,
                  record.receiveAsset.chain,
                ),
              );
              addLastSnackbar(
                t('addressbook.added').replace('{name}', name),
                SnackbarDurationEnum.short,
              );
            }}
          />
        )}
      </SwapFlowScreen>
    </InfoTipHost>
  );
};

/** The swap's Zcash transactions, unfolding as the summary opens. */
function LegsCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const unfold = useUnfold();
  return (
    <Animated.View
      style={[
        {
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          borderRadius: radiusMd,
          backgroundColor: colors.bgCanvas,
          marginTop: 4,
        },
        unfold,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default SwapDetail;
