/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { space4, space8 } from '@app/theme';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import {
  ConfirmButton,
  ConfirmOptions,
  registerConfirmListener,
} from '@app/services/showConfirm';

// The confirmation sheet behind showConfirm: title, message, the actions as
// full-width pills (red when destructive) and Cancel as a link under them.
const ConfirmBottomSheet: React.FC = () => {
  const ref = useRef<BottomSheetModal>(null);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolvedRef = useRef<boolean>(false);

  useEffect(() => {
    registerConfirmListener(opts => {
      resolvedRef.current = false;
      setOptions(opts);
      ref.current?.present();
    });
    return () => registerConfirmListener(null);
  }, []);

  const handleButton = useCallback((button: ConfirmButton) => {
    resolvedRef.current = true;
    ref.current?.dismiss();
    if (button.onPress) {
      setTimeout(button.onPress, 0);
    }
  }, []);

  const handleSheetDismissed = useCallback(() => {
    if (resolvedRef.current || !options) {
      return;
    }
    resolvedRef.current = true;
    const cancel = options.buttons.find(b => b.style === 'cancel');
    if (cancel?.onPress) {
      setTimeout(cancel.onPress, 0);
    }
  }, [options]);

  const all = options?.buttons ?? [];
  const actions = all.filter(b => b.style !== 'cancel');
  const cancel = all.find(b => b.style === 'cancel');

  return (
    <AppSheetModal
      ref={ref}
      handle
      dismissable={false}
      onDismiss={handleSheetDismissed}
      contentStyle={{
        paddingHorizontal: 20,
      }}
    >
      <Text
        testID="confirm.title"
        variant="bodyStrong"
        style={{ marginTop: space4, textAlign: 'center' }}
      >
        {options?.title ?? ''}
      </Text>
      {!!options?.message && (
        <Text
          testID="confirm.message"
          variant="caption"
          tone={options.messageTone === 'danger' ? 'danger' : 'muted'}
          style={{
            marginTop: space8,
            textAlign: options.messageAlign ?? 'center',
          }}
        >
          {options.message}
        </Text>
      )}
      {options?.content}
      <View style={{ marginTop: 20, gap: 10 }}>
        {actions.map((b, i) => (
          <Button
            key={`${i}-${b.text}`}
            testID={`confirm.action.${i}`}
            variant={
              b.style === 'destructive'
                ? 'danger'
                : b.style === 'ghost'
                  ? 'text'
                  : 'primary'
            }
            title={b.text}
            onPress={() => handleButton(b)}
          />
        ))}
      </View>
      {!!cancel && (
        <Button
          testID="confirm.cancel"
          variant="quiet"
          title={cancel.text}
          onPress={() => handleButton(cancel)}
          style={{ marginTop: 8 }}
        />
      )}
    </AppSheetModal>
  );
};

export default React.memo(ConfirmBottomSheet);
