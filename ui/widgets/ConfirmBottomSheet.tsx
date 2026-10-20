/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@app/theme';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import BoldText from '@ui/primitives/BoldText';
import RegText from '@ui/primitives/RegText';
import Button from '@ui/primitives/Button';
import {
  ConfirmButton,
  ConfirmOptions,
  registerConfirmListener,
} from '@app/services/showConfirm';

const SOFT_INK = '#8DA0B8';

// The confirmation sheet behind showConfirm: title, message, the actions as
// full-width pills (red when destructive) and Cancel as a link under them.
const ConfirmBottomSheet: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
        paddingHorizontal: 22,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <BoldText
        testID="confirm.title"
        style={{
          marginTop: 4,
          textAlign: 'center',
          fontSize: 15.5,
          lineHeight: 21,
        }}
      >
        {options?.title ?? ''}
      </BoldText>
      {!!options?.message && (
        <RegText
          testID="confirm.message"
          color={options.messageTone === 'danger' ? colors.fgDanger : SOFT_INK}
          style={{
            marginTop: 6,
            fontSize: 12,
            lineHeight: 18,
            textAlign: options.messageAlign ?? 'center',
          }}
        >
          {options.message}
        </RegText>
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
