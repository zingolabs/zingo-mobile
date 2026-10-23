/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable, View } from 'react-native';
import { slopFor, space16, useTheme, iconSize, space8 } from '@app/theme';
import Text from '@ui/primitives/Text';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';

type SheetTitleProps = {
  title: string;
  onClose: () => void;
  closeLabel: string;
  /** A step back inside the sheet, shown in place of the empty left slot. */
  onBack?: () => void;
  backLabel?: string;
};

/** The header of a swap sheet: an optional back, the title, a close. */
export default function SheetTitle({
  title,
  onClose,
  closeLabel,
  onBack,
  backLabel,
}: SheetTitleProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: space8,
        paddingBottom: space8,
        paddingHorizontal: space16,
      }}
    >
      <View style={{ width: 44, alignItems: 'flex-start' }}>
        {!!onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            hitSlop={slopFor(24)}
            onPress={onBack}
          >
            <ChevronLeft size={iconSize} color={colors.fgAccent} />
          </Pressable>
        )}
      </View>
      <Text
        variant="subtitle"
        numberOfLines={1}
        style={{ flex: 1, textAlign: 'center' }}
      >
        {title}
      </Text>
      <View style={{ width: 44, alignItems: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          hitSlop={slopFor(24)}
          onPress={onClose}
        >
          <XIcon size={iconSize} color={colors.fgDefault} />
        </Pressable>
      </View>
    </View>
  );
}
