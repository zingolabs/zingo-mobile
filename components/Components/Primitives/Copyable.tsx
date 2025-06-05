import Clipboard from '@react-native-clipboard/clipboard';
import React from 'react';
import { Pressable } from 'react-native';

interface CopyableProps {
  value: string;
  onCopy?: () => void;
  children: React.ReactNode;
}

export function Copyable({ value, onCopy, children }: CopyableProps) {
  const doCopy = () => {
    Clipboard.setString(value);
    if (onCopy) onCopy();
  };

  return <Pressable onPress={doCopy}>{children}</Pressable>;
}
