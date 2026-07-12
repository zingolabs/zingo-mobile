/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCheck,
  faMagnifyingGlass,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';

import { TokenEntryType } from '../../../app/swap';
import { TranslateType } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import { useKeyboardHeight } from '../../../app/hooks/useKeyboardHeight';
import BoldText from '../../Components/BoldText';
import FadeText from '../../Components/FadeText';
import RegText from '../../Components/RegText';
import TokenLogo from './TokenLogo';
import { chainDisplayName } from './chainDisplayName';

/**
 * Snap-point array kept at module scope so the array identity is stable
 * across renders — gorhom internally watches `snapPoints` for changes and a
 * fresh array on every render triggers needless re-measurement.
 */
const SNAP_POINTS: string[] = ['95%'];

/**
 * Bottom-sheet picker for the non-ZEC asset of a swap.
 *
 * Layout mirrors `Receive`'s "title-as-content" pattern (handleComponent is
 * null and the title bar is drawn as the first content row) so the
 * sticky search input below it can be re-rendered on every keystroke
 * without remounting — putting the input inside a memoised
 * `handleComponent` callback caused the keyboard to dismiss on every
 * character.
 *
 * The `tokens` list is expected to be pre-deduped and filtered by the
 * `TokenCatalog` — this component does no networking itself.
 */
type AssetPickerSheetProps = {
  title: string;
  tokens: TokenEntryType[];
  selectedIdentifier: string | null;
  onChange: (token: TokenEntryType) => void;
  translate: (key: string) => TranslateType;
  testID?: string;
};

const AssetPickerSheet = forwardRef<BottomSheetModal, AssetPickerSheetProps>(
  ({ title, tokens, selectedIdentifier, onChange, translate, testID }, ref) => {
    const { colors } = useTheme() as ThemeType;
    const keyboardHeight = useKeyboardHeight();

    const [query, setQuery] = useState<string>('');

    const t = useCallback(
      (key: string, fallback: string): string =>
        (translate(key) as string) || fallback,
      [translate],
    );

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

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

    // Reset the query when the sheet is dismissed (index becomes -1), NOT
    // when it opens. Resetting on open caused a visible jump: the list
    // started filtered to whatever the user typed last session, then
    // unfiltered to the full ~139 items once the sheet was already
    // on-screen. Resetting on close means the next open already starts
    // from a clean state and renders in one frame.
    const onSheetChange = useCallback((index: number) => {
      if (index < 0) setQuery('');
    }, []);

    // Filter ONLY on the two strings each row actually renders: the top label
    // (`ticker`, falling back to `name`/`symbol` exactly as the row does) and
    // the chain display name. We deliberately do NOT search the raw `symbol`
    // and `name` when a ticker exists: SwapKit fills those inconsistently
    // ("Binance-Peg …", "Wrapped BNB", contract-suffixed symbols), so a query
    // like `bnb` used to match rows whose visible ticker+chain had nothing to
    // do with it — results the user couldn't correlate with what they saw.
    // Matching the on-screen text keeps the filtered list and the query in
    // sync. `bnb` still finds BNB Chain assets via the "BNB Chain" display
    // name. We also keep the raw chain code searchable so abbreviations the
    // display name hides still work (typing `bsc` finds BNB Chain, `arb`
    // Arbitrum, etc.) — the code never contains the noise word "bnb", so it
    // does not reintroduce the spurious matches we just removed. Empty query
    // returns the original list reference so React skips re-rendering
    // unchanged item rows.
    const filteredTokens = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (q.length === 0) return tokens;
      return tokens.filter(token => {
        const label = (
          token.ticker ||
          token.name ||
          token.symbol ||
          ''
        ).toLowerCase();
        const chain = (token.chain ?? '').toLowerCase();
        const chainDisp = chainDisplayName(token.chain).toLowerCase();
        return label.includes(q) || chain.includes(q) || chainDisp.includes(q);
      });
    }, [tokens, query]);

    return (
      <BottomSheetModal
        ref={ref}
        accessible={false}
        // Fixed snap point so the sheet stays tall regardless of how many
        // items the active search query leaves visible. With dynamic
        // sizing the sheet shrinks down to "1 row" height when the user
        // narrows the filter, which feels jarring.
        enableDynamicSizing={false}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        onAnimate={(from, to) => {
          // Opening (from === -1) dismisses a keyboard left open by the
          // underlying screen so the sheet never renders behind it. Guard
          // avoids fighting the search field's own keyboard.
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        onChange={onSheetChange}
        handleComponent={null}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderBackdrop}
      >
        <View style={{ flex: 1 }}>
          {/* Title bar drawn as content (not via handleComponent) so the
              search input rendered just below survives keystroke re-renders
              without losing focus / dismissing the keyboard. */}
          <View
            style={{
              paddingTop: 8,
              paddingHorizontal: 16,
              backgroundColor: colors.bottomSheetBackground,
              borderTopLeftRadius: 40,
              borderTopRightRadius: 40,
              borderTopWidth: 1,
              borderLeftWidth: 0.5,
              borderRightWidth: 0.5,
              borderTopColor: colors.bottomSheetBorder,
              borderLeftColor: colors.bottomSheetBorder,
              borderRightColor: colors.bottomSheetBorder,
            }}
          >
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
                style={{ flex: 1, textAlign: 'center', color: colors.text }}
              >
                {title}
              </BoldText>
              <Pressable
                onPress={dismiss}
                accessibilityRole="button"
                hitSlop={8}
                style={{ padding: 14 }}
              >
                <FontAwesomeIcon icon={faXmark} size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Search row */}
            <View
              style={[
                styles.searchRow,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                size={14}
                color={colors.placeholder}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('swap.search-asset', 'Search')}
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                style={[styles.searchInput, { color: colors.text }]}
                testID="swap.asset-picker.search"
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
                    color={colors.placeholder}
                  />
                </Pressable>
              )}
            </View>
            <View style={{ height: 8 }} />
          </View>

          <BottomSheetScrollView
            testID={testID}
            style={{ backgroundColor: colors.bottomSheetBackground }}
            contentContainerStyle={{
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
            }}
          >
            {filteredTokens.map(token => {
              const selected = token.identifier === selectedIdentifier;
              return (
                <Pressable
                  key={token.identifier}
                  onPress={() => {
                    onChange(token);
                    dismiss();
                  }}
                  // Border colour `#122033` matches the separator used by the
                  // other list components in the app (address book, address
                  // list, history) for a consistent feel across screens.
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
                  <TokenLogo
                    token={token}
                    size={35}
                    surfaceColor={colors.bottomSheetBackground}
                  />
                  <View style={{ flex: 1 }}>
                    {/* SwapKit-demo convention: clean `ticker` on top, chain
                        below. `name`/`symbol` are intentionally NOT shown —
                        SwapKit ships `name` inconsistently ("Tether" vs "USDT"
                        vs "L2 Standard Bridged USDT (Base)") and `symbol`
                        contract-suffixed ("USDT-0xdac1…"). Within the buckets we
                        keep (Maya/Near/Flashnet) ticker+chain is effectively
                        unique: real variants carry distinct tickers (USDT vs
                        nrUsdt vs USDT0), so no two rows collide. The chain text
                        also fixes the ambiguous L2 badge (Base/ARB/OP all render
                        the ETH diamond, since their gas token is ETH). */}
                    <RegText
                      style={{
                        fontSize: 16,
                        color: selected ? colors.primary : colors.text,
                        fontWeight: selected ? '600' : '500',
                      }}
                    >
                      {token.ticker || token.name || token.symbol}
                    </RegText>
                    <FadeText style={{ fontSize: 12 }}>
                      {chainDisplayName(token.chain)}
                    </FadeText>
                  </View>
                  {selected && (
                    <FontAwesomeIcon
                      icon={faCheck}
                      size={16}
                      color={colors.primary}
                    />
                  )}
                </Pressable>
              );
            })}
          </BottomSheetScrollView>
        </View>
      </BottomSheetModal>
    );
  },
);

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

export default React.memo(AssetPickerSheet);
