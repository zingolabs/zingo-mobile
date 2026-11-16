import React, { createContext, forwardRef, useContext } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

/** True inside an `AppSheetModal`, whose sheet follows the focused input. */
export const InModalSheet = createContext<boolean>(false);

/** A text input that tells its sheet when it takes the focus. */
const FieldInput = forwardRef<TextInput, TextInputProps>((props, ref) => {
  const inSheet = useContext(InModalSheet);
  if (!inSheet) {
    return <TextInput ref={ref} {...props} />;
  }
  const attach = (node: TextInput | null | undefined) => {
    if (typeof ref === 'function') {
      ref(node ?? null);
    } else if (ref) {
      ref.current = node ?? null;
    }
  };
  return <BottomSheetTextInput ref={attach} {...props} />;
});

FieldInput.displayName = 'FieldInput';

export default FieldInput;
