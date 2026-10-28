import React, { useState } from 'react';
import { View } from 'react-native';
import { space8 } from '@app/theme';
import Checkbox from '@ui/primitives/Checkbox';

/**
 * The "Don’t show this again" row of a warning sheet. It keeps its own tick,
 * since the sheet is drawn outside the screen that asked for it, and tells
 * the caller each change.
 */
export default function DontShowAgain({
  label,
  onChange,
  testID,
}: {
  label: string;
  onChange: (checked: boolean) => void;
  testID?: string;
}) {
  const [checked, setChecked] = useState<boolean>(false);
  return (
    <View style={{ marginBottom: space8 }}>
      <Checkbox
        testID={testID}
        label={label}
        checked={checked}
        onChange={next => {
          setChecked(next);
          onChange(next);
        }}
      />
    </View>
  );
}
