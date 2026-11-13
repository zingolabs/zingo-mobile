/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { InputAccessoryView, Keyboard, Platform, View } from 'react-native';
import { space8, space16, useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import Button from '@ui/primitives/Button';

/** The id an amount field passes as `inputAccessoryViewID`. */
export const AMOUNT_DONE_BAR = 'swap.amount.done-bar';

/** A Done bar over iOS's decimal pad, which has no key to close it. */
export default function AmountDoneBar() {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  if (Platform.OS !== 'ios') {
    return null;
  }
  return (
    <InputAccessoryView nativeID={AMOUNT_DONE_BAR}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingVertical: space8,
          paddingHorizontal: space16,
          backgroundColor: colors.bgChrome,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
        }}
      >
        <Button
          testID="swap.amount.done"
          variant="text"
          size="small"
          inline
          title={translate('swap.done') as string}
          onPress={() => Keyboard.dismiss()}
        />
      </View>
    </InputAccessoryView>
  );
}
