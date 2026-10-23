/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Linking, Pressable, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { radiusMd, useTheme } from '@app/theme';
import {
  BlockExplorerEnum,
  ChainNameEnum,
  GlobalConst,
  Route,
  SendPageStateClass,
  SnackbarDurationEnum,
  ToAddrClass,
  TransactionActionEnum,
  ValueTransferKindEnum,
  ValueTransferType,
} from '@app/AppState';
import Utils from '@app/utils';
import { AppDrawerParamList, WalletNavigation } from '@app/types';
import { ContextAppLoaded } from '@app/context';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { removeTransaction } from '@app/walletBackend';
import { createAlert } from '@app/services/createAlert';
import { showConfirm } from '@app/services/showConfirm';
import { fiatQuote } from '@app/price/fiatQuote';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import FullPanel from '@ui/widgets/FullPanel';
import { ArrowDownIcon } from '@ui/primitives/Icons/ArrowDownIcon';
import { ArrowUpIcon } from '@ui/primitives/Icons/ArrowUpIcon';
import { ClockIcon } from '@ui/primitives/Icons/ClockIcon';
import { ShieldIcon } from '@ui/primitives/Icons/ShieldIcon';
import { RefreshIcon } from '@ui/primitives/Icons/RefreshIcon';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import DetailRows from '@screens/Swap/components/DetailRows';
import type { DetailRow } from '@screens/Swap/components/DetailRows';
import ContactInitial from '@screens/Swap/components/ContactInitial';

type ValueTransferDetailProps = NativeStackScreenProps<
  AppDrawerParamList,
  'ValueTransferDetail'
>;

const MASK = '•••••';

/**
 * A transaction, opened from History in the static full panel: its avatar,
 * what happened, the amount at 36, today's dollars and its status, then a
 * card with the date, where it went, the pool, the fee, confirmations, the
 * transaction ID and the memo. A failed send offers to try again.
 */
const ValueTransferDetail: React.FunctionComponent<
  ValueTransferDetailProps
> = ({ route }) => {
  const navigation = useNavigation<WalletNavigation>();
  const {
    info,
    translate,
    language,
    privacy,
    addLastSnackbar,
    server,
    addressBook,
    addresses,
    setBackgroundError,
    netInfo,
    blockExplorer,
    zecPrice,
    setSendPageState,
  } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const t = (key: string) => (translate(key) as string).trim();

  const vt: ValueTransferType = route.params?.vt ?? ({} as ValueTransferType);
  const { memo, memoUA } = Utils.splitMemo(vt.memos);
  const failed = vt.status === RPCValueTransfersStatusEnum.failed;
  const received = vt.kind === ValueTransferKindEnum.Received;
  const sent = vt.kind === ValueTransferKindEnum.Sent;
  const pending =
    !failed &&
    vt.confirmations >= 0 &&
    vt.confirmations < GlobalConst.minConfirmations;
  const contact = vt.address
    ? addressBook.find(entry => entry.address === vt.address)
    : undefined;
  const ownAddress = (address: string) =>
    !!addresses?.some(entry => entry.address === address);

  const close = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  /** What happened, in the prototype's words. */
  const head = (() => {
    switch (vt.kind) {
      case ValueTransferKindEnum.Received:
        return t('history.received');
      case ValueTransferKindEnum.Shield:
        return t('history.shield');
      case ValueTransferKindEnum.SendToSelf:
        return t('history.tx-self');
      case ValueTransferKindEnum.MemoToSelf:
        return t('history.memotoself');
      case ValueTransferKindEnum.Migration:
        return t('history.migration');
      case ValueTransferKindEnum.Rejection:
        return t('history.rejection');
      default:
        return contact
          ? t('history.sent-to').replace('{name}', contact.label)
          : t('history.sent');
    }
  })();

  const avatar = (() => {
    if (contact && sent) {
      return (
        <ContactInitial name={contact.label} color={contact.color} size={56} />
      );
    }
    const icon = pending ? (
      <ClockIcon size={24} color={colors.fgDefault} />
    ) : received ? (
      <ArrowDownIcon size={24} color={colors.fgDefault} />
    ) : vt.kind === ValueTransferKindEnum.Shield ? (
      <ShieldIcon size={24} color={colors.fgDefault} />
    ) : vt.kind === ValueTransferKindEnum.SendToSelf ? (
      <RefreshIcon size={24} color={colors.fgDefault} />
    ) : (
      <ArrowUpIcon size={24} color={colors.fgDefault} />
    );
    return (
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: failed
            ? colors.bgDangerSubtle
            : colors.bgMutedSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
    );
  })();

  const status = failed
    ? {
        text: t('history.state-failed'),
        fg: colors.fgDanger,
        bg: colors.bgDangerSubtle,
      }
    : vt.confirmations === 0
      ? {
          text: t('history.in-mempool'),
          fg: colors.fgTransparent,
          bg: colors.bgTransparent,
        }
      : pending
        ? {
            text: t('history.confirming')
              .replace('{n}', String(vt.confirmations))
              .replace('{of}', String(GlobalConst.minConfirmations)),
            fg: colors.fgTransparent,
            bg: colors.bgTransparent,
          }
        : {
            text: t('swap.tx-confirmed'),
            fg: colors.fgPriceUp,
            bg: colors.bgAccentSubtle,
          };

  const quote = fiatQuote(zecPrice, server, info.chainName);
  const todayUsd =
    quote.kind === 'quote' && server.chainName === ChainNameEnum.mainChainName
      ? `$${Utils.parseNumberFloatToStringLocale(vt.amount * quote.price, 2)}`
      : '';
  const sign = received
    ? '+'
    : vt.kind === ValueTransferKindEnum.Shield
      ? ''
      : '−';
  /** Four decimals cut, not rounded, and the rest smaller: never more than it was. */
  const split = Utils.splitZecAmountIntoBigSmall(vt.amount);

  const rows: DetailRow[] = [
    {
      label: t('history.tx-date'),
      value: vt.time
        ? Utils.formatDate(vt.time * 1000, 'MMM d, yyyy · h:mm aaa', language)
        : '—',
    },
    ...(sent && vt.address
      ? [
          {
            label: t('history.tx-to'),
            value: Utils.trimToSmall(vt.address, 6),
            copy: vt.address,
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
    ...(vt.poolType ? [{ label: t('history.pool'), value: vt.poolType }] : []),
    ...(!received && !!vt.fee && vt.fee > 0
      ? [
          {
            label: t('history.tx-fee'),
            value: `${Utils.parseNumberFloatToStringLocale(vt.fee, 8)} ${info.currencyName}`,
          },
        ]
      : []),
    {
      label: t('history.confirmations'),
      value:
        failed || vt.confirmations < 0
          ? '—'
          : vt.confirmations.toLocaleString(),
    },
    ...(vt.txid
      ? [
          {
            label: t('history.txid'),
            value: Utils.trimToSmall(vt.txid, 6),
            copy: vt.txid,
          },
        ]
      : []),
  ];

  const explorerUrl =
    vt.txid &&
    !failed &&
    server.chainName !== ChainNameEnum.regtestChainName &&
    blockExplorer !== BlockExplorerEnum.None
      ? Utils.getBlockExplorerTxIDURL(vt.txid, server.chainName, blockExplorer)
      : '';

  /** A failed send goes back to Send with what it carried, to send again. */
  const tryAgain = () => {
    const state = new SendPageStateClass(new ToAddrClass(0));
    state.toaddr.to = vt.address ?? '';
    state.toaddr.amount = String(vt.amount);
    state.toaddr.memo = memo ?? '';
    setSendPageState(state);
    navigation.navigate(Route.Home, { screen: Route.Send });
  };

  const remove = () =>
    showConfirm({
      title: t('history.remove-title'),
      message: t('history.remove-alert'),
      buttons: [
        {
          text: t('confirm'),
          onPress: async () => {
            if (!setBackgroundError || !addLastSnackbar) {
              return;
            }
            if (!netInfo.isConnected || server.kind === 'offline') {
              addLastSnackbar(t('loadedapp.connection-error'));
              return;
            }
            navigation.navigate(Route.Computing);
            const result = await removeTransaction(vt.txid);
            const action = TransactionActionEnum.remove;
            createAlert(
              setBackgroundError,
              addLastSnackbar,
              t(`history.${action}-title`),
              result.ok
                ? `${t(`history.${action}-message`)} ${result.value}`
                : `${t(`history.${action}-error`)} ${result.error.message}`,
              result.ok,
              translate,
            );
            navigation.navigate(Route.Home, { screen: Route.History });
          },
        },
        { text: t('cancel'), style: 'cancel' },
      ],
    });

  return (
    <FullPanel
      testID="valuetransferdetail.scroll-view"
      title={t('history.transaction')}
      onBack={close}
      footer={
        failed || explorerUrl ? (
          <View style={{ rowGap: 8 }}>
            {failed && sent && (
              <Button
                testID="valuetransferdetail.try-again"
                variant="primary"
                title={t('history.try-again')}
                onPress={tryAgain}
              />
            )}
            {failed && vt.confirmations === 0 && (
              <Button
                testID="valuetransferdetail.remove"
                variant="quiet"
                title={t('history.remove')}
                onPress={remove}
              />
            )}
            {!!explorerUrl && (
              <Button
                testID="valuetransferdetail.explorer"
                variant="text"
                title={t('history.tx-explorer')}
                onPress={() => Linking.openURL(explorerUrl)}
              />
            )}
          </View>
        ) : undefined
      }
    >
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <View style={{ marginBottom: 12 }}>{avatar}</View>
        <Text
          variant="bodyStrong"
          style={{ fontWeight: '600', textAlign: 'center' }}
        >
          {head}
        </Text>
        <Text
          testID="valuetransferdetail.amount"
          style={{
            marginTop: 12,
            fontSize: 36,
            lineHeight: 40,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
            color: failed
              ? colors.fgMuted
              : received
                ? colors.fgPriceUp
                : colors.fgDefault,
          }}
        >
          {privacy ? MASK : `${sign}${split.bigPart}`}
          {!privacy && split.smallPart !== '0000' && !!split.smallPart && (
            <Text style={{ fontSize: 24, color: colors.fgMuted }}>
              {split.smallPart}
            </Text>
          )}
          <Text style={{ fontSize: 18, color: colors.fgMuted }}>
            {` ${info.currencyName}`}
          </Text>
        </Text>
        {!!todayUsd && (
          <Text variant="bodySmall" tone="muted" style={{ marginTop: 2 }}>
            {privacy
              ? MASK
              : t('history.today-price').replace('{usd}', todayUsd)}
          </Text>
        )}
        <View
          style={{
            marginTop: 12,
            paddingHorizontal: 6,
            borderRadius: 5,
            backgroundColor: status.bg,
          }}
        >
          <Text
            variant="caption"
            style={{
              color: status.fg,
              fontWeight: '600',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            {status.text}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 24 }}>
        <DetailRows rows={rows} />
      </View>

      {(!!memo || !!memoUA) && (
        <View
          style={{
            marginTop: 12,
            paddingVertical: 10,
            paddingHorizontal: 14,
            rowGap: 4,
            borderRadius: radiusMd,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            backgroundColor: colors.bgCanvas,
          }}
        >
          <Text variant="caption" tone="muted">
            {t('history.tx-memo')}
          </Text>
          {!!memo && (
            <Pressable
              testID="valuetransferdetail.memo"
              onPress={() => {
                Clipboard.setString(memo);
                addLastSnackbar(
                  t('history.memocopied'),
                  SnackbarDurationEnum.short,
                );
              }}
            >
              <Text variant="body" selectable>
                {memo}
              </Text>
            </Pressable>
          )}
          {!!memoUA && (
            <Pressable
              onPress={() => {
                Clipboard.setString(memoUA);
                if (!ownAddress(memoUA)) {
                  addLastSnackbar(
                    t('history.address-http'),
                    SnackbarDurationEnum.long,
                  );
                }
                addLastSnackbar(
                  t('history.addresscopied'),
                  SnackbarDurationEnum.short,
                );
              }}
              style={{ rowGap: 2 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  columnGap: 4,
                }}
              >
                <Text variant="caption" tone="muted">
                  {GlobalConst.replyTo}
                </Text>
                {!ownAddress(memoUA) && (
                  <TriangleAlert size={14} color={colors.fgWarning} />
                )}
              </View>
              <Text variant="address">{memoUA}</Text>
            </Pressable>
          )}
        </View>
      )}
    </FullPanel>
  );
};

export default ValueTransferDetail;
