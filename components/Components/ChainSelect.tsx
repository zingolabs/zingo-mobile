/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCheck,
  faChevronDown,
  faMagnifyingGlass,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import { TranslateType } from '../../app/AppState';
import Utils from '../../app/utils';
import { useKeyboardHeight } from '../../app/hooks/useKeyboardHeight';
import BoldText from './BoldText';
import FadeText from './FadeText';
import RegText from './RegText';
import SheetRim from './SheetRim';
import { chainDisplayName } from '../Swap/components/chainDisplayName';
import { getChainIcon } from '../Swap/components/chainIcons';

// Zcash has no entry in the bundled `chainIcons` map; use the app's own logo.
const ZCASH_LOGO = require('../../assets/img/zcash-yellow.png');

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
  const src = upper === 'ZEC' ? ZCASH_LOGO : getChainIcon(upper);
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
          borderColor: colors.borderMuted,
          marginTop: 10,
        }}
      >
        <ChainLogo chain={value} size={24} />
        <RegText
          style={{
            flex: 1,
            color: colors.fgDefault,
            fontWeight: '600',
            fontSize: 14,
          }}
        >
          {chainDisplayName(value)}
        </RegText>
        {canPick ? (
          <FontAwesomeIcon
            icon={faChevronDown}
            size={16}
            color={colors.fgMuted}
          />
        ) : null}
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
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
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
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
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
                <FontAwesomeIcon
                  icon={faXmark}
                  size={20}
                  color={colors.fgDefault}
                />
              </Pressable>
            </View>

            {/* Search row */}
            <View
              style={[
                styles.searchRow,
                {
                  backgroundColor: colors.bgCanvas,
                  borderColor: colors.borderMuted,
                },
              ]}
            >
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                size={14}
                color={colors.fgMuted}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('addressbook.search-placeholder', 'Search')}
                placeholderTextColor={colors.fgMuted}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                style={[styles.searchInput, { color: colors.fgDefault }]}
                testID="chainselect.search"
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <FontAwesomeIcon
                    icon={faXmark}
                    size={14}
                    color={colors.fgMuted}
                  />
                </Pressable>
              )}
            </View>
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
                    borderBottomColor: '#122033',
                  })}
                >
                  <ChainLogo chain={chain} size={35} />
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
                  {selected && (
                    <FontAwesomeIcon
                      icon={faCheck}
                      size={16}
                      color={colors.fgAccent}
                    />
                  )}
                </Pressable>
              );
            })}
          </BottomSheetScrollView>
        </View>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
});

export default ChainSelect;
