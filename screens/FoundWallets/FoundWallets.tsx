/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  iconSizeSm,
  radiusPill,
  space8,
  space12,
  space16,
  space20,
  useTheme,
} from '@app/theme';
import { ChainNameEnum } from '@app/AppState';
import type { TranslateType } from '@app/AppState';
import type { RecoveryEntry } from '@app/services/recoveryWalletInfo';
import { formatInteger } from '@app/utils/formatAmount';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';
import { useRoomForWallet } from '@app/hooks/useRoomForWallet';
import RoomNote from '@screens/AddWallet/RoomNote';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import Checkbox from '@ui/primitives/Checkbox';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { SproutIcon } from '@ui/primitives/Icons/SproutIcon';
import { SnowflakeIcon } from '@ui/primitives/Icons/SnowflakeIcon';
import Card from '@ui/widgets/Card';
import TitleBar from '@ui/widgets/TitleBar';
import { useScrollEdges } from '@ui/widgets/ScrollEdges';

const ICON_DISC = 40;
const ROW_MIN = 56;

type FoundWalletsProps = {
  translate: (key: string) => TranslateType;
  entries: RecoveryEntry[];
  busy: boolean;
  onImport: (entries: RecoveryEntry[]) => void;
  onBack: () => void;
};

/** The wallets a previous install left in the Keychain, all ticked, to import at once. */
export default function FoundWallets({
  translate,
  entries,
  busy,
  onImport,
  onBack,
}: FoundWalletsProps) {
  const { colors } = useTheme();
  const bottomPad = useBottomActionPad();
  const { edges, fades } = useScrollEdges();
  const [off, setOff] = useState<Set<number>>(() => new Set());
  const room = useRoomForWallet();
  const t = (key: string) => translate(key) as string;

  const chosen = entries.filter((_e, i) => !off.has(i));
  const toggle = (i: number) =>
    setOff(prev => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      <TitleBar
        title={t('found.sheet')}
        left={{
          icon: ChevronLeft,
          accent: true,
          onPress: onBack,
          accessibilityLabel: t('import.back-acc'),
          testID: 'found.back',
          disabled: busy,
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        {...edges}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: space20,
          paddingTop: space8,
        }}
      >
        <Text
          variant="caption"
          tone="muted"
          style={{ textAlign: 'center', marginBottom: space16 }}
        >
          {t('found.note')}
        </Text>
        <Card flush>
          {entries.map((entry, i) => {
            const key = !entry.seed;
            const Glyph = key ? SnowflakeIcon : SproutIcon;
            const chain = (entry.chain ||
              ChainNameEnum.mainChainName) as ChainNameEnum;
            return (
              <View
                key={entry.walletId || `legacy-${i}`}
                style={{
                  minHeight: ROW_MIN,
                  paddingHorizontal: space16,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: colors.borderSubtle,
                  justifyContent: 'center',
                }}
              >
                <Checkbox
                  testID={`found.row.${i}`}
                  checked={!off.has(i)}
                  disabled={busy}
                  onChange={() => toggle(i)}
                  label={
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space12,
                        marginLeft: space8 / 2,
                      }}
                    >
                      <View
                        style={{
                          width: ICON_DISC,
                          height: ICON_DISC,
                          borderRadius: radiusPill,
                          backgroundColor: key
                            ? colors.bgViewOnlySubtle
                            : colors.bgAccentSubtle,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Glyph
                          size={iconSizeSm}
                          color={key ? colors.fgViewOnly : colors.fgAccent}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong">
                          {t(key ? 'wallets.type-key' : 'wallets.type-seed')}
                        </Text>
                        <Text variant="bodySmall" tone="muted">
                          {t('found.row-birthday')
                            .replace(
                              '{network}',
                              t(`settings.value-chainname-${chain}`),
                            )
                            .replace('{height}', formatInteger(entry.birthday))}
                        </Text>
                      </View>
                    </View>
                  }
                />
              </View>
            );
          })}
        </Card>
      </ScrollView>
      {fades}
      <View style={{ paddingHorizontal: space20, paddingBottom: bottomPad }}>
        <RoomNote room={room} translate={translate} />
        <Button
          testID="found.import"
          variant="primary"
          title={
            chosen.length === entries.length
              ? t('found.import-all')
              : t('found.import-n').replace('{n}', String(chosen.length))
          }
          busy={busy}
          disabled={chosen.length === 0 || room.kind === 'full'}
          onPress={() => onImport(chosen)}
        />
      </View>
    </View>
  );
}
