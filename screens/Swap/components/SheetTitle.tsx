import React from 'react';
import TitleBar from '@ui/widgets/TitleBar';
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

/** The header of a swap sheet: the shared TitleBar with an optional back and a close. */
export default function SheetTitle({
  title,
  onClose,
  closeLabel,
  onBack,
  backLabel,
}: SheetTitleProps) {
  return (
    <TitleBar
      title={title}
      left={
        onBack
          ? {
              icon: ChevronLeft,
              accent: true,
              accessibilityLabel: backLabel ?? '',
              onPress: onBack,
            }
          : undefined
      }
      right={{ icon: XIcon, accessibilityLabel: closeLabel, onPress: onClose }}
    />
  );
}
