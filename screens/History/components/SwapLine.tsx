/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WalletNavigation } from '@app/types';
import { slopFor, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import {
  SwapDirectionEnum,
  SwapStatusEnum,
  canonicalChainAddress,
} from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import Utils from '@app/utils';
import { SwapIcon } from '@ui/primitives/Icons/SwapIcon';
import { ClockIcon } from '@ui/primitives/Icons/ClockIcon';
import { ChevronDown, ChevronUp } from '@ui/primitives/Icons/Chevron';
import { swapScreenFor } from '@screens/Swap/swapRoute';
import {
  shortWhen,
  swapInFlight,
  swapRowText,
} from '@screens/History/historyRowText';
import HistoryAvatar from './HistoryAvatar';
import Avatar, { avatarCategoryOf } from '@ui/widgets/Avatar';
import HistoryRowBody from './HistoryRowBody';

type SwapLineProps = {
  index: number;
  record: SwapRecordType;
  hairline: boolean;
  /** How many Zcash transactions fold under the row; 0 draws no chevron. */
  legCount: number;
  open: boolean;
  onToggle: () => void;
};

/**
 * A swap in History: one row in its place by date, with the other coin as
 * the icon's badge, what it got on top and what left under it. The chevron
 * unfolds its Zcash transactions; the row opens the swap where it stands.
 */
function SwapLine({
  index,
  record,
  hairline,
  legCount,
  open,
  onToggle,
}: SwapLineProps) {
  const navigation = useNavigation<WalletNavigation>();
  const { translate, language, privacy, addressBook } =
    useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const t = (key: string) => (translate(key) as string).trim();
  const sale = record.direction === SwapDirectionEnum.Outbound;
  const contact =
    sale && record.status === SwapStatusEnum.Completed
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
  const text = swapRowText({
    record,
    contactName: contact?.label,
    when: shortWhen(record.createdAtMs, Date.now(), t, ms =>
      Utils.formatDate(ms, 'MMM d', language),
    ),
    t,
  });
  const other =
    record.direction === SwapDirectionEnum.Outbound
      ? record.receiveAsset
      : record.sellAsset;
  const icon = swapInFlight(record) ? (
    <ClockIcon size={18} color={colors.fgDefault} />
  ) : (
    <SwapIcon size={18} color={colors.fgDefault} />
  );
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <Pressable
      testID={`swap-${index + 1}`}
      accessibilityRole="button"
      onPress={() =>
        navigation.navigate(swapScreenFor(record.status), {
          recordId: record.recordId,
        })
      }
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.bgMutedSubtle : colors.bgSurface,
      })}
    >
      <HistoryRowBody
        leading={
          contact ? (
            <Avatar
              kind="contact"
              name={contact.label}
              category={avatarCategoryOf(contact.color)}
              chain={other.ticker ?? other.symbol}
              size="md"
            />
          ) : (
            <HistoryAvatar icon={icon} badge={other} />
          )
        }
        text={text}
        privacy={privacy}
        hairline={hairline}
        trailing={
          legCount > 0 ? (
            <Pressable
              testID={`swap-${index + 1}.expand`}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={t('history.swap-moves-acc')}
              hitSlop={slopFor(28)}
              onPress={onToggle}
              style={{ marginRight: -8, width: 28, alignItems: 'center' }}
            >
              <Chevron size={16} color={colors.fgMuted} />
            </Pressable>
          ) : (
            <View style={{ width: 20 }} />
          )
        }
      />
    </Pressable>
  );
}

export default React.memo(SwapLine);
