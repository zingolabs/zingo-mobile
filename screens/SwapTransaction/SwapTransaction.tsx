/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext } from 'react';
import { formatZecAmount } from '@app/utils/formatZecAmount';
import {
  formatAmount,
  formatInteger,
  formatUsd,
} from '@app/utils/formatAmount';
import { Linking, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  space4,
  space12,
  space16,
  radiusMd,
  useTheme,
  iconSizeMd,
} from '@app/theme';
import { AppDrawerParamList } from '@app/types';
import {
  Route,
  SnackbarDurationEnum,
  ValueTransferKindEnum,
} from '@app/AppState';
import { ContextAppLoaded, useSwapRecords } from '@app/context';
import { fiatQuote } from '@app/price/fiatQuote';
import Utils from '@app/utils';
import { transferStatus } from '@app/utils/transferStatus';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import Pressable from '@ui/primitives/Pressable';
import Banner from '@ui/widgets/Banner';
import { ArrowDownIcon } from '@ui/primitives/Icons/ArrowDownIcon';
import { ArrowUpIcon } from '@ui/primitives/Icons/ArrowUpIcon';
import SwapFlowScreen from '@screens/Swap/components/SwapFlowScreen';
import DetailHero from '@screens/Swap/components/DetailHero';
import DetailRows from '@screens/Swap/components/DetailRows';
import type { DetailRow } from '@screens/Swap/components/DetailRows';
import ShieldNote from '@screens/Swap/components/ShieldNote';
import { useSwapRecord } from '@screens/Swap/useSwapRecord';
import { legName, legRole, legsOf } from '@screens/Swap/swapLegs';

type SwapTransactionProps = NativeStackScreenProps<
  AppDrawerParamList,
  typeof Route.SwapTransaction
>;

/**
 * One of a swap's Zcash transactions, in plain words: what it was, the
 * amount, when, where it went, its fee, confirmations and id, and a line on
 * what that address is. Its addresses are used once, so there is no send
 * again and no save contact; a payment to a provider warns off sending more.
 */
const SwapTransaction: React.FunctionComponent<SwapTransactionProps> = ({
  navigation,
  route,
}) => {
  const { recordId, txid, kind, slot } = route.params;
  const {
    translate,
    language,
    valueTransfers,
    info,
    zecPrice,
    server,
    walletChainName,
    blockExplorer,
    addLastSnackbar,
  } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const records = useSwapRecords();
  const record = useSwapRecord(recordId);
  const leg = legsOf(records, valueTransfers ?? [], recordId).filter(
    vt => vt.txid === txid && vt.kind === kind,
  )[slot ?? 0];
  const t = (key: string) => (translate(key) as string).trim();
  const back = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  if (!record || !leg) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  const received = leg.kind === ValueTransferKindEnum.Received;
  const quote = fiatQuote(zecPrice, server, server.chainName);
  const price =
    leg.zecPrice && leg.zecPrice > 0
      ? leg.zecPrice
      : quote.kind === 'quote'
        ? quote.price
        : 0;
  const role = legRole(leg, record, t);
  const { memo } = Utils.splitMemo(leg.memos);
  const status = transferStatus(leg, t);
  const rows: DetailRow[] = [
    {
      label: t('swap.detail-date'),
      value: Utils.formatDate(
        leg.time * 1000,
        'MMM d, yyyy · h:mm aaa',
        language,
      ),
    },
    ...(role.warn
      ? [
          {
            label: t('swap.tx-privacy'),
            value: t('swap.tx-private'),
            tone: 'nym' as const,
          },
        ]
      : []),
    ...(leg.address
      ? [
          {
            label: t(
              received ? 'swap.detail-received-at' : 'swap.detail-sent-to',
            ),
            value: Utils.trimToSmall(leg.address, 6),
            copy: leg.address,
          },
        ]
      : []),
    ...(leg.fee && leg.fee > 0
      ? [
          {
            label: t('swap.tx-fee'),
            value: `${formatAmount(leg.fee)} ${info.currencyName}`,
          },
        ]
      : []),
    {
      label: t('swap.tx-confirmations'),
      value: formatInteger(leg.confirmations),
    },
    {
      label: t('swap.tx-id'),
      value: Utils.trimToSmall(leg.txid, 6),
      copy: leg.txid,
    },
  ];
  const explorerUrl = Utils.getBlockExplorerTxIDURL(
    leg.txid,
    walletChainName,
    blockExplorer,
  );

  return (
    <SwapFlowScreen
      testID="swap.transaction"
      title={t('swap.tx-title')}
      onBack={back}
      footer={
        explorerUrl ? (
          <Button
            testID="swap.transaction.explorer"
            variant="text"
            title={t('swap.detail-explorer')}
            onPress={() => Linking.openURL(explorerUrl)}
          />
        ) : undefined
      }
    >
      <DetailHero
        icon={
          received ? (
            <ArrowDownIcon size={iconSizeMd} color={colors.fgDefault} />
          ) : (
            <ArrowUpIcon size={iconSizeMd} color={colors.fgDefault} />
          )
        }
        title={legName(leg, record, t)}
        amount={`${received ? '+' : '−'}${formatZecAmount(leg.amount)}`}
        unit={info.currencyName}
        tone={received ? 'positive' : 'default'}
        line={price > 0 ? `≈ ${formatUsd(leg.amount * price)}` : ''}
        pill={status.text}
        pillTone={status.tone}
      />
      <DetailRows rows={rows} />
      {!!memo && (
        <View
          style={{
            marginTop: space12,
            paddingVertical: space12,
            paddingHorizontal: space16,
            rowGap: space4,
            borderRadius: radiusMd,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            backgroundColor: colors.bgCanvas,
          }}
        >
          <Text variant="caption" tone="muted">
            {t('history.tx-memo')}
          </Text>
          <Pressable
            kind="link"
            testID="swap.transaction.memo"
            onPress={() => {
              Clipboard.setString(memo);
              addLastSnackbar(
                t('history.memocopied'),
                SnackbarDurationEnum.short,
              );
            }}
          >
            <Text variant="address" selectable>
              {memo}
            </Text>
          </Pressable>
        </View>
      )}
      {!!role.note && !!leg.address && (
        <Text variant="caption" tone="muted" style={{ marginTop: space12 }}>
          {role.note}
        </Text>
      )}
      {role.warn && (
        <View style={{ marginTop: space12 }}>
          <Banner tone="warning" title={t('swap.tx-dont-send')} />
        </View>
      )}
      {received && (
        <View style={{ marginTop: space12 }}>
          <ShieldNote text={t('swap.shield-note')} />
        </View>
      )}
    </SwapFlowScreen>
  );
};

export default SwapTransaction;
