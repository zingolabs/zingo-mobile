/* geometry-gap: DESIGN.md known gap */
/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Keyboard, View } from 'react-native';
import { useTheme, space8, space16, space20 } from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import TitleBar from '@ui/widgets/TitleBar';

import { TranslateType } from '@app/AppState';
import Utils from '@app/utils';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import BoldText from '@ui/primitives/BoldText';
import FadeText from '@ui/primitives/FadeText';
import RegText from '@ui/primitives/RegText';
import SearchField from '@ui/widgets/SearchField';
import { chainDisplayName } from './chainDisplayName';
import { getChainIcon } from './chainIcons';
import { fieldBorder } from '@ui/primitives/fieldBorder';
import { ChevronDown } from '@ui/primitives/Icons/Chevron';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';

/**
 * Fixed snap point kept at module scope so the array identity is stable across
 * renders (gorhom re-measures when `snapPoints` changes identity). A fixed tall
 * sheet keeps the list from collapsing to one row when a search query narrows
 * it.
 */
const SNAP_POINTS: string[] = ['95%'];

/**
 * The chain's logo: the app Zcash mark for ZEC, the bundled per-chain icon
 * otherwise, and a coloured letter avatar (chain siglas) when we ship no icon —
 * so the slot is never empty.
 */
export const ChainLogo: React.FunctionComponent<{
  chain: string;
  size: number;
}> = ({ chain, size }) => {
  const upper = (chain || '').toUpperCase();
  const src = getChainIcon(upper);
  if (src) {
    return (
      <Image
        source={src}
        resizeMode="contain"
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  const bg = Utils.generateColorFromSeed(upper || '?');
  const fg = Utils.getLabelColor(bg);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BoldText style={{ color: fg, fontSize: Math.round(size * 0.34) }}>
        {upper.slice(0, 3)}
      </BoldText>
    </View>
  );
};

type ChainSelectProps = {
  // Label shown to the left of the chip.
  label: string;
  // Current chain (SwapKit code, e.g. 'ZEC' / 'BTC').
  value: string;
  // Selectable chains. A single entry (the chain that triggered the flow)
  // renders a static chip with no chevron / picker.
  options: string[];
  onChange: (chain: string) => void;
  translate: (key: string) => TranslateType;
  disabled?: boolean;
};

const ChainSelect: React.FunctionComponent<ChainSelectProps> = ({
  label,
  value,
  options,
  onChange,
  translate,
  disabled,
}) => {
  const { colors } = useTheme();
  const keyboardHeight = useKeyboardHeight();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState<string>('');
  const canPick = !disabled && options.length > 1;

  const t = useCallback(
    (key: string, fallback: string): string =>
      (translate(key) as string) || fallback,
    [translate],
  );

  const dismiss = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  // Filter on the two strings each row renders: the display name and the raw
  // chain code (so `btc` finds Bitcoin, `sol` Solana, etc.). Empty query keeps
  // the original reference so React skips re-rendering unchanged rows.
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) {
      return options;
    }
    return options.filter(chain => {
      const code = (chain ?? '').toLowerCase();
      const name = chainDisplayName(chain).toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [options, query]);

  return (
    <View>
      {/* Label on the first line, then a bordered field matching the other
          form fields on the screen: chain logo + name inside, and a down
          chevron only when it is actually a list (more than one option). */}
      <Text variant="bodySmall" tone="muted" style={{ fontWeight: '600' }}>
        {label}
      </Text>
      <Pressable
        kind="row"
        testID="chainselect.field"
        disabled={!canPick}
        onPress={() => {
          Keyboard.dismiss();
          sheetRef.current?.present();
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          columnGap: 10,
          minHeight: 48,
          paddingHorizontal: 10,
          borderWidth: 1,
          borderRadius: 12,
          borderColor: fieldBorder(colors, false),
          marginTop: space8,
        }}
      >
        <ChainLogo chain={value} size={24} />
        <RegText
          style={{
            flex: 1,
            color: colors.fgDefault,
            fontWeight: '600',
            fontSize: 15,
          }}
        >
          {chainDisplayName(value)}
        </RegText>
        <FadeText
          testID="chainselect.ticker"
          style={{ fontSize: 12, letterSpacing: 0.4 }}
        >
          {(value || '').toUpperCase()}
        </FadeText>
        {canPick ? <ChevronDown size={16} color={colors.fgMuted} /> : null}
      </Pressable>

      <AppSheetModal
        ref={sheetRef}
        // Fixed tall snap point so the sheet doesn't shrink to "1 row" when the
        // search query narrows the list.
        snapPoints={SNAP_POINTS}
        // Reset the query on close, not on open — resetting on open makes the
        // list flash filtered→unfiltered once the sheet is already on screen.
        onDismiss={() => setQuery('')}
        contentStyle={
          keyboardHeight > 0
            ? { paddingBottom: keyboardHeight + space20 }
            : undefined
        }
        header={
          /* The title and search drawn as content, so the input survives keystroke re-renders. */
          <View style={{ paddingBottom: space8 }}>
            <TitleBar
              title={
                translate('addressbook.select-chain-placeholder') as string
              }
              right={{
                icon: XIcon,
                accessibilityLabel: t('close', ''),
                onPress: dismiss,
              }}
            />
            <View style={{ paddingHorizontal: space16 }}>
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder={t('addressbook.search-placeholder', 'Search')}
                testID={'chainselect.search'}
              />
            </View>
          </View>
        }
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
        >
          {filteredOptions.map(chain => {
            const selected = chain === value;
            return (
              <Pressable
                kind="row"
                key={chain}
                onPress={() => {
                  onChange(chain);
                  dismiss();
                }}
                // Separator colour matches the other list components in the
                // app (address book, address list, history, asset picker).
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  columnGap: 12,
                  borderBottomWidth: 1.5,
                  borderBottomColor: colors.borderSubtle,
                }}
              >
                <ChainLogo chain={chain} size={36} />
                <View style={{ flex: 1 }}>
                  <RegText
                    style={{
                      fontSize: 16,
                      color: selected ? colors.fgAccent : colors.fgDefault,
                      fontWeight: selected ? '600' : '500',
                    }}
                  >
                    {chainDisplayName(chain)}
                  </RegText>
                  <FadeText style={{ fontSize: 12 }}>
                    {(chain || '').toUpperCase()}
                  </FadeText>
                </View>
                {selected && <CheckIcon size={16} color={colors.fgAccent} />}
              </Pressable>
            );
          })}
        </BottomSheetScrollView>
      </AppSheetModal>
    </View>
  );
};

export default ChainSelect;
