/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useTheme } from '@app/theme';
import { SearchIcon } from '@ui/primitives/Icons/SearchIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { fieldBorder } from '@ui/primitives/fieldBorder';

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  testID?: string;
  clearLabel?: string;
};

// The search box of every list that filters as you type.
const SearchField: React.FunctionComponent<SearchFieldProps> = ({
  value,
  onChangeText,
  placeholder,
  testID,
  clearLabel,
}) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        height: 42,
        paddingHorizontal: 13,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: fieldBorder(colors, focused),
        backgroundColor: colors.bgSurface,
      }}
    >
      <SearchIcon size={16} color={colors.fgMuted} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.fgMuted}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        style={{
          flex: 1,
          minWidth: 0,
          paddingVertical: 0,
          color: colors.fgDefault,
          fontSize: 15,
        }}
      />
      {value.length > 0 && (
        <Pressable
          testID={testID ? `${testID}-clear` : undefined}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          hitSlop={8}
          onPress={() => onChangeText('')}
        >
          <XIcon size={16} color={colors.fgMuted} />
        </Pressable>
      )}
    </View>
  );
};

export default SearchField;
