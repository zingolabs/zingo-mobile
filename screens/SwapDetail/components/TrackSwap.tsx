/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { BlockExplorerEnum, ChainNameEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { buildTrackerEntries } from '@app/swap';
import type { SwapRecordType, TrackerWhatType } from '@app/swap';
import { iconSizeSm, space12, space8, useTheme } from '@app/theme';
import { duration } from '@app/theme/motion';
import Utils from '@app/utils';
import Pressable from '@ui/primitives/Pressable';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { ExternalLinkIcon } from '@ui/primitives/Icons/ExternalLinkIcon';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import FoldSection from './FoldSection';

/** What a link shows, in words. */
function describe(what: TrackerWhatType, t: (key: string) => string): string {
  const chain = (symbol: string) => chainDisplayName(symbol) || symbol;
  switch (what.kind) {
    case 'swap':
      return t('swap.track-swap');
    case 'provider':
      return t('swap.track-provider').replace('{provider}', what.provider);
    case 'deposit':
      return t('swap.track-deposit')
        .replace('{coin}', what.coin)
        .replace('{chain}', chain(what.chain));
    case 'hop':
      return t('swap.track-hop').replace('{chain}', chain(what.chain));
    case 'leg':
      return t('swap.track-leg').replace('{chain}', chain(what.chain));
    case 'delivery':
      return t('swap.track-delivery')
        .replace('{coin}', what.coin)
        .replace('{chain}', chain(what.chain));
    case 'refund':
      return t('swap.track-refund').replace('{chain}', chain(what.chain));
    case 'depositAddress':
      return t('swap.track-deposit-address').replace(
        '{chain}',
        chain(what.chain),
      );
  }
}

/**
 * Every place a swap that did not finish well can be looked up: SwapKit,
 * the provider, then each leg's chain explorer, Zcash last. Opens closed
 * each time the screen opens; nothing when there is no link to give.
 */
export default function TrackSwap({
  record,
  zecChainName,
  zecBlockExplorer,
}: {
  record: SwapRecordType;
  zecChainName: ChainNameEnum;
  zecBlockExplorer: BlockExplorerEnum;
}) {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const t = (key: string) => (translate(key) as string).trim();
  const [open, setOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const entries = buildTrackerEntries({
    record,
    zecChainName,
    zecBlockExplorer,
  });
  if (entries.length === 0) {
    return null;
  }

  const copyAll = () => {
    Clipboard.setString(entries.map(e => `${e.name}: ${e.url}`).join('\n'));
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), duration.hold);
  };

  return (
    <View style={{ marginTop: space12 }}>
      <FoldSection
        testID="swap.detail.track"
        title={t('swap.track-title')}
        count={entries.length}
        open={open}
        onToggle={() => setOpen(o => !o)}
      >
        {entries.map((entry, index) => (
          <Pressable
            kind="row"
            key={entry.key}
            testID={`swap.detail.track.${entry.key}`}
            accessibilityRole="link"
            onPress={() => Linking.openURL(entry.url)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              columnGap: space12,
              minHeight: 44,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.borderSubtle,
            }}
          >
            <View style={{ flexShrink: 1 }}>
              <Text variant="bodyStrong">{entry.name}</Text>
              <Text variant="caption" tone="muted">
                {describe(entry.what, t)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                columnGap: space8,
              }}
            >
              <Text variant="address" numberOfLines={1}>
                {Utils.trimToSmall(entry.id, 6)}
              </Text>
              <ExternalLinkIcon size={iconSizeSm} color={colors.fgMuted} />
            </View>
          </Pressable>
        ))}
      </FoldSection>
      {open && (
        <View style={{ alignItems: 'center', marginTop: space8 }}>
          <Button
            testID="swap.detail.track.copy-all"
            variant="text"
            inline
            icon={copied ? CheckIcon : CopyIcon}
            title={t(copied ? 'swap.copied' : 'swap.track-copy-all')}
            onPress={copyAll}
          />
        </View>
      )}
    </View>
  );
}
