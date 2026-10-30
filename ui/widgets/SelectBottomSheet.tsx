/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTheme, iconSizeSm, space8, space16 } from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import AppSheetModal, { SheetScrollView } from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import SearchField from '@ui/widgets/SearchField';
import TitleBar from '@ui/widgets/TitleBar';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';

export type SelectBottomSheetItem = {
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
  /** The X's label for screen readers. */
  closeLabel?: string;
};

// Tall fixed sheet for the searchable variant so the list doesn't collapse to
// "one row" as a query narrows it. Module scope keeps the array identity stable.
const SNAP_POINTS: string[] = ['95%'];

const SelectBottomSheet = forwardRef<BottomSheetModal, SelectBottomSheetProps>(
  (
    {
      title,
      items,
      value,
      onChange,
      testID,
      searchable,
      searchPlaceholder,
      closeLabel = '',
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const [query, setQuery] = useState<string>('');

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

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

    const rows = filteredItems.map(item => {
      const selected = item.value === value;
      return (
        <Pressable
          kind="row"
          key={item.value}
          onPress={() => {
            onChange(item.value);
            dismiss();
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingVertical: 14,
          }}
        >
          <Text
            variant={selected ? 'bodyStrong' : 'body'}
            tone={selected ? 'accent' : 'default'}
          >
            {item.label}
          </Text>
          {selected && <CheckIcon size={iconSizeSm} color={colors.fgAccent} />}
        </Pressable>
      );
    });

    const titleBar = (
      <TitleBar
        title={title}
        right={{
          icon: XIcon,
          accessibilityLabel: closeLabel,
          onPress: dismiss,
        }}
      />
    );

    return (
      <AppSheetModal
        ref={ref}
        // Searchable: a fixed tall sheet, its search field drawn with the
        // title so the input survives keystroke re-renders. Otherwise the
        // sheet takes its list's height.
        snapPoints={searchable ? SNAP_POINTS : undefined}
        // Reset the query on close, not on open, so the next open starts clean
        // and renders unfiltered in one frame (no visible filter→unfilter jump).
        onDismiss={() => setQuery('')}
        header={
          searchable ? (
            <View style={{ paddingBottom: space8 }}>
              {titleBar}
              <View style={{ paddingHorizontal: space16 }}>
                <SearchField
                  value={query}
                  onChangeText={setQuery}
                  placeholder={searchPlaceholder ?? ''}
                  testID={testID ? `${testID}.search` : undefined}
                />
              </View>
            </View>
          ) : (
            titleBar
          )
        }
      >
        {searchable ? (
          <BottomSheetScrollView
            testID={testID}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
          >
            {rows}
          </BottomSheetScrollView>
        ) : (
          <SheetScrollView testID={testID}>{rows}</SheetScrollView>
        )}
      </AppSheetModal>
    );
  },
);

export default React.memo(SelectBottomSheet);
