/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { ContextAppLoaded } from '@app/context';
import Button from '@ui/primitives/Button';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';

/** How long a copy button shows that it copied. */
export const COPIED_MS = 2000;

/** A copy button with a label, which reads "Copied" for a moment at its own width. */
export default function CopyPill({
  testID,
  label,
  value,
}: {
  testID: string;
  label: string;
  value: string;
}) {
  const { translate } = useContext(ContextAppLoaded);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <View style={{ flex: 1 }}>
      <Button
        testID={testID}
        variant="secondary"
        size="small"
        icon={copied ? CheckIcon : CopyIcon}
        title={copied ? (translate('swap.copied') as string) : label}
        onPress={() => {
          Clipboard.setString(value);
          setCopied(true);
        }}
      />
    </View>
  );
}
