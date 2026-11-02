/* geometry-gap: DESIGN.md known gap */
/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme, iconSizeMd } from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import { SearchIcon } from '@ui/primitives/Icons/SearchIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { fieldBorder } from '@ui/primitives/fieldBorder';
import { singleLineInput } from '@ui/primitives/singleLineInput';

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
          ...singleLineInput(),
        }}
      />
      {value.length > 0 && (
        <Pressable
          kind="icon"
          testID={testID ? `${testID}-clear` : undefined}
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          hitSlop={8}
          onPress={() => onChangeText('')}
        >
          <XIcon size={iconSizeMd} color={colors.fgMuted} />
        </Pressable>
      )}
    </View>
  );
};

export default SearchField;
