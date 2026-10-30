/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Pressable from '@ui/primitives/Pressable';
import AppSheetModal, { SheetScrollView } from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import TitleBar from '@ui/widgets/TitleBar';
import { XIcon } from '@ui/primitives/Icons/XIcon';

export type ActionMenuBottomSheetAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type ActionMenuBottomSheetProps = {
  title?: string;
  actions: ActionMenuBottomSheetAction[];
  testID?: string;
  /** The X's label for screen readers. */
  closeLabel?: string;
};

const ActionMenuBottomSheet = forwardRef<
  BottomSheetModal,
  ActionMenuBottomSheetProps
>(({ title, actions, testID, closeLabel = '' }, ref) => {
  const dismiss = useCallback(() => {
    (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
  }, [ref]);

  return (
    <AppSheetModal
      ref={ref}
      header={
        <TitleBar
          title={title ?? ''}
          right={{
            icon: XIcon,
            accessibilityLabel: closeLabel,
            onPress: dismiss,
          }}
        />
      }
    >
      <SheetScrollView testID={testID}>
        {actions.map((action, idx) => (
          <Pressable
            kind="row"
            key={`${idx}-${action.label}`}
            onPress={() => {
              dismiss();
              // Fire after dismiss so any Alert/follow-up sheet shows on the
              // resolved stack, not racing the close animation.
              setTimeout(() => action.onPress(), 0);
            }}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 14,
            }}
          >
            <Text
              variant="body"
              tone={action.destructive ? 'danger' : 'default'}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </SheetScrollView>
    </AppSheetModal>
  );
});

export default React.memo(ActionMenuBottomSheet);
