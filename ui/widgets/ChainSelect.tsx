/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  Pressable,
  TouchableOpacity,
  View,
} from 'react-native';
import { radiusSheet, useTheme } from '@app/theme';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import { TranslateType } from '@app/AppState';
import Utils from '@app/utils';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';
import BoldText from '@ui/primitives/BoldText';
import FadeText from '@ui/primitives/FadeText';
import RegText from '@ui/primitives/RegText';
import SheetRim from '@ui/primitives/SheetRim';
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

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  // Reset the query on close (index -1), not on open — resetting on open makes
  // the list flash filtered→unfiltered once the sheet is already on screen.
  const onSheetChange = useCallback((index: number) => {
    if (index < 0) {
      setQuery('');
    }
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
      <RegText>{label}</RegText>
      <TouchableOpacity
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
          marginTop: 10,
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
      </TouchableOpacity>

      <BottomSheetModal
        ref={sheetRef}
        accessible={false}
        // Fixed tall snap point so the sheet doesn't shrink to "1 row" when the
        // search query narrows the list.
        enableDynamicSizing={false}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        onAnimate={(from, to) => {
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        onChange={onSheetChange}
        handleComponent={null}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
        }}
        backdropComponent={renderBackdrop}
      >
        <View style={{ flex: 1 }}>
          {/* Title bar drawn as content (not handleComponent) so the search
              input below survives keystroke re-renders without losing focus. */}
          <View
            style={{
              paddingTop: 8,
              paddingHorizontal: 16,
              backgroundColor: colors.bgSurface,
              borderTopLeftRadius: radiusSheet,
              borderTopRightRadius: radiusSheet,
            }}
          >
            <SheetRim />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 6,
              }}
            >
              <View style={{ width: 48 }} />
              <BoldText
                numberOfLines={1}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  color: colors.fgDefault,
                }}
              >
                {translate('addressbook.select-chain-placeholder') as string}
              </BoldText>
              <Pressable
                onPress={dismiss}
                accessibilityRole="button"
                hitSlop={8}
                style={{ padding: 14 }}
              >
                <XIcon size={20} color={colors.fgDefault} />
              </Pressable>
            </View>

            {/* Search row */}
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={t('addressbook.search-placeholder', 'Search')}
              testID={'chainselect.search'}
            />
            <View style={{ height: 8 }} />
          </View>

          <BottomSheetScrollView
            style={{ backgroundColor: colors.bgSurface }}
            contentContainerStyle={{
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
            }}
          >
            {filteredOptions.map(chain => {
              const selected = chain === value;
              return (
                <Pressable
                  key={chain}
                  onPress={() => {
                    onChange(chain);
                    dismiss();
                  }}
                  // Separator colour matches the other list components in the
                  // app (address book, address list, history, asset picker).
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    columnGap: 12,
                    opacity: pressed ? 0.6 : 1,
                    borderBottomWidth: 1.5,
                    borderBottomColor: colors.borderSubtle,
                  })}
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
        </View>
      </BottomSheetModal>
    </View>
  );
};

export default ChainSelect;
