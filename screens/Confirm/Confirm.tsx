/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useMemo } from 'react';
import { View } from 'react-native';

import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import FullPanel from '@ui/widgets/FullPanel';
import Banner from '@ui/widgets/Banner';
import { ArrowUpIcon } from '@ui/primitives/Icons/ArrowUpIcon';
import { space16, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { useBiometricGate } from '@app/hooks/useBiometricGate';
import DetailRows, { DetailRow } from '@screens/Swap/components/DetailRows';
import NymNote from '@screens/Swap/components/NymNote';
import Avatar, { avatarCategoryOf } from '@ui/widgets/Avatar';
import { kindKey } from '@screens/Send/components/RecipientField';

import { AppDrawerParamList } from '@app/types';
import Utils from '@app/utils';
import { deliver } from '@app/navigation/results';
import { fiatQuote, toFiatText } from '@app/price/fiatQuote';
import { sendPermit } from '@app/walletBackend/transforms/sendPermit';
import { SendPageStateClass, ProposalPoolsType } from '@app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type ConfirmProps = NativeStackScreenProps<AppDrawerParamList, 'Confirm'>;

const poolCrossingKey = ({
  source,
  destination,
}: ProposalPoolsType): string | null => {
  if (source.length === 0 || destination.length === 0) {
    return null;
  }
  if (destination.includes('transparent')) {
    return 'send.deshielded';
  }
  return new Set([...source, ...destination]).size === 1
    ? 'send.private'
    : 'send.amountrevealed';
};

/** ZEC with the four decimals the review reads in. */
const zec4 = (value: number) => Utils.parseNumberFloatToStringLocale(value, 4);

/**
 * The review of a send, in the full panel: who it goes to with their avatar,
 * the amount at 36 with its value, then privacy, memo, fee and total; a
 * transparent recipient warns that it is public, and the Nym note says the
 * send goes through the mixnet.
 */
const Confirm: React.FunctionComponent<ConfirmProps> = ({
  navigation,
  route,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    info,
    translate,
    zecPrice,
    defaultUnifiedAddress,
    addLastSnackbar,
    server,
    biometrics,
    addressBook,
  } = context;
  const { colors } = useTheme();
  const t = (key: string) => translate(key) as string;
  const quote = fiatQuote(zecPrice, server, server.chainName);
  const permit = sendPermit(context);

  // Audit Issue D — the biometric gate lives at the
  // Confirm screen entry. Mirrors Seed / Ufvk / Settings / Rescan via
  // the shared hook. Trade-off vs. the previous bio-on-press model: a
  // brief window after auth where the Confirm button can be pressed
  // without re-authenticating. Native stack remounts the screen on each
  // navigation, so leaving and coming back forces a fresh prompt.
  const screenGate = useBiometricGate({
    needsAuth: biometrics,
    translate,
    addLastSnackbar,
    onCancel: () => navigation.goBack(),
  });
  const authPassed = screenGate.kind === 'passed';

  const calculatedFee = route.params?.calculatedFee ?? 0;
  const proposalPools: ProposalPoolsType = route.params?.proposalPools ?? {
    source: [],
    destination: [],
  };
  const sendAllAmount = route.params?.sendAllAmount ?? false;
  const sendPageState: SendPageStateClass =
    route.params?.sendPageState ?? ({} as SendPageStateClass);
  const to = sendPageState.toaddr;

  const memoTotal = Utils.buildMemo(
    to.memo,
    to.includeUAMemo,
    defaultUnifiedAddress,
  );
  const amount = Utils.parseStringLocaleToNumberFloat(to.amount);
  const total = amount + calculatedFee;

  const contact = useMemo(
    () => addressBook.find(entry => entry.address === to.to),
    [addressBook, to.to],
  );
  const transparent = /^t/i.test(to.to);
  const who = contact?.label ?? (to.znsAlias || '');

  const close = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Send, beneath this screen, runs the proposal once more on entry.
  useEffect(() => {
    deliver('send.propose', '');
  }, []);

  if (!authPassed) {
    return <View style={{ flex: 1, backgroundColor: colors.bgCanvas }} />;
  }

  const privacyKey = poolCrossingKey(proposalPools);
  const unit = info.currencyName || 'ZEC';
  const rows: DetailRow[] = [
    {
      label: t('send.confirm-privacy-level'),
      value: privacyKey ? t(privacyKey) : '-',
      badge: t('send.nym-enhanced'),
    },
    ...(memoTotal
      ? [{ label: t('send.memo'), value: memoTotal, wrap: true }]
      : []),
    { label: t('send.network-fee'), value: `${zec4(calculatedFee)} ${unit}` },
    { label: t('send.total'), value: `${zec4(total)} ${unit}` },
  ];

  const avatar = contact ? (
    <Avatar
      kind="contact"
      name={contact.label}
      category={avatarCategoryOf(contact.color)}
      size="lg"
    />
  ) : to.znsAlias ? (
    <Avatar
      kind="contact"
      name={to.znsAlias}
      category={avatarCategoryOf(to.znsAlias)}
      size="lg"
    />
  ) : (
    <Avatar kind="icon" icon={ArrowUpIcon} size="lg" />
  );

  return (
    <FullPanel
      title={t('send.review')}
      onBack={close}
      testID="send.confirm.scroll-view"
      footer={
        <View>
          {permit.kind === 'error' && (
            <Text
              testID="send.confirm.refusal"
              variant="caption"
              tone="muted"
              style={{ textAlign: 'center', marginBottom: 12 }}
            >
              {t(permit.errorKey)}
            </Text>
          )}
          <ButtonStack>
            <Button variant="quiet" title={t('cancel')} onPress={close} />
            <Button
              testID="send.confirm.button"
              variant="nym"
              title={
                sendAllAmount
                  ? t('send.confirm-nym-all')
                  : t('send.confirm-nym')
              }
              onPress={() => deliver('send.confirm', '')}
              disabled={permit.kind === 'error'}
            />
          </ButtonStack>
        </View>
      }
    >
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <View style={{ marginBottom: 12 }}>{avatar}</View>
        <Text
          variant="caption"
          style={{
            color: colors.bgNym,
            fontWeight: '600',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {t('send.nym-processing-title')}
        </Text>
        <Text
          variant="bodyStrong"
          style={{ fontWeight: '600', textAlign: 'center' }}
        >
          {who ? (
            t('send.sending-to').replace('{who}', who)
          ) : (
            <>
              {t('send.sending-to').replace('{who}', '')}
              <Text variant="address">{Utils.trimToSmall(to.to, 6)}</Text>
            </>
          )}
        </Text>
        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: 4, textAlign: 'center' }}
        >
          <Text variant="address">{Utils.trimToSmall(to.to, 6)}</Text>
          {` · ${t(kindKey(to.to))}`}
        </Text>
        <Text
          testID="send.confirm.amount"
          variant="balance"
          style={{ marginTop: 12, fontVariant: ['tabular-nums'] }}
        >
          {zec4(amount)}
          <Text variant="subtitle" tone="muted">{` ${unit}`}</Text>
        </Text>
        {quote.kind === 'quote' && (
          <Text
            testID="send.confirm.fiat"
            variant="bodySmall"
            tone="muted"
            style={{ marginTop: 4, fontVariant: ['tabular-nums'] }}
          >
            {'$' + toFiatText(to.amount, quote.price)}
          </Text>
        )}
      </View>
      <View style={{ marginTop: 24 }}>
        <DetailRows rows={rows} />
      </View>
      {transparent && (
        <View style={{ marginTop: space16 }}>
          <Banner tone="warning" title={t('send.review-transparent')} />
        </View>
      )}
      <View style={{ marginTop: space16 }}>
        <NymNote text={t('send.nym-warning')} />
      </View>
    </FullPanel>
  );
};

export default Confirm;
