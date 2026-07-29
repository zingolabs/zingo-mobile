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

import BoldText from './BoldText';
import RegText from './RegText';
import { ThemeType } from '../../app/types';
import { useKeyboardHeight } from '../../app/hooks/useKeyboardHeight';

type SelectBottomSheetItem = {
  label: string;
  value: string;
};

type SelectBottomSheetProps = {
  title: string;
  items: SelectBottomSheetItem[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
  // When true a search field is shown and the list filters by both the visible
  // label and the value (e.g. a contact's name AND its address). Used by the
  // long contact pickers; left off for the short selects (server, scope, …).
  searchable?: boolean;
  searchPlaceholder?: string;
};

// Tall fixed sheet for the searchable variant so the list doesn't collapse to
// "one row" as a query narrows it. Module scope keeps the array identity stable.
const SNAP_POINTS: string[] = ['95%'];

const SelectBottomSheet = forwardRef<BottomSheetModal, SelectBottomSheetProps>(
  (
    { title, items, value, onChange, testID, searchable, searchPlaceholder },
    ref,
  ) => {
    const { colors } = useTheme() as ThemeType;
    const keyboardHeight = useKeyboardHeight();
    const [query, setQuery] = useState<string>('');

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

    // Reset the query on close (index -1), not on open, so the next open starts
    // clean and renders unfiltered in one frame (no visible filter→unfilter jump).
    const onSheetChange = useCallback((index: number) => {
      if (index < 0) {
        setQuery('');
      }
    }, []);

    // Search matches the on-screen label and the value (address), so a user can
    // type the start of an address too. Empty query returns the original list
    // reference so React skips re-rendering unchanged rows.
    const filteredItems = useMemo(() => {
      if (!searchable) {
        return items;
      }
      const q = query.trim().toLowerCase();
      if (q.length === 0) {
        return items;
      }
      return items.filter(
        item =>
          item.label.toLowerCase().includes(q) ||
          item.value.toLowerCase().includes(q),
      );
    }, [items, query, searchable]);

    const renderHandle = useCallback(
      () => (
        <View
          style={{
            paddingTop: 8,
            paddingBottom: 6,
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
            }}
          >
            {/* Left spacer matches the X Pressable's width (14×2 + 20 = 48). */}
            <View style={{ width: 48 }} />
            <BoldText
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 16,
                lineHeight: 28,
                textAlign: 'center',
              }}
            >
              {title}
            </BoldText>
            <Pressable
              onPress={dismiss}
              hitSlop={8}
              style={{ paddingHorizontal: 14, paddingVertical: 4 }}
            >
              <FontAwesomeIcon icon={faXmark} size={20} color={colors.zingo} />
            </Pressable>
          </View>
        </View>
      ),
      [colors, dismiss, title],
    );

    const list = (
      <BottomSheetScrollView
        testID={testID}
        style={{ backgroundColor: colors.bottomSheetBackground }}
        contentContainerStyle={{
          paddingBottom:
            searchable && keyboardHeight > 0 ? keyboardHeight + 20 : 30,
        }}
      >
        {filteredItems.map(item => {
          const selected = item.value === value;
          return (
            <Pressable
              key={item.value}
              onPress={() => {
                onChange(item.value);
                dismiss();
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 24,
                paddingVertical: 14,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <RegText
                style={{
                  fontSize: 16,
                  color: selected ? colors.primary : colors.text,
                  fontWeight: selected ? '600' : '400',
                }}
              >
                {item.label}
              </RegText>
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
    );

    return (
      <BottomSheetModal
        ref={ref}
        accessible={false}
        // Searchable: fixed tall sheet + title/search drawn as content (so the
        // input survives keystroke re-renders without dismissing the keyboard).
        // Otherwise: the compact handle + dynamic sizing as before.
        enableDynamicSizing={!searchable}
        snapPoints={searchable ? SNAP_POINTS : undefined}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        onAnimate={(from, to) => {
          // Opening (from === -1) dismisses a keyboard left open by the
          // underlying screen so the sheet never renders behind it. Guard
          // avoids fighting a keyboard the sheet itself focuses later.
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        onChange={onSheetChange}
        handleComponent={searchable ? null : renderHandle}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderBackdrop}
      >
        {searchable ? (
          <View style={{ flex: 1 }}>
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
                  <FontAwesomeIcon
                    icon={faXmark}
                    size={20}
                    color={colors.text}
                  />
                </Pressable>
              </View>

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
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  style={[styles.searchInput, { color: colors.text }]}
                  testID={testID ? `${testID}.search` : undefined}
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
            {list}
          </View>
        ) : (
          list
        )}
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

export default React.memo(SelectBottomSheet);
