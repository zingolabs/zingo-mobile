/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import TitleBar from '@ui/widgets/TitleBar';
import Text from '@ui/primitives/Text';
import { View } from 'react-native';
import {
  useTheme,
  iconSizeSm,
  space4,
  space8,
  space12,
  space16,
  space20,
} from '@app/theme';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import AppSheetModal, { SheetFooter } from '@ui/primitives/AppSheetModal';
import Card from '@ui/widgets/Card';

import { TranslateType } from '@app/AppState';
import Button from '@ui/primitives/Button';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { InfoIcon } from '@ui/primitives/Icons/InfoIcon';

/**
 * Informational sheet that surfaces the raw error(s) returned by the fee
 * (`sendPreview`) and/or spendable-balance RPC. Both are shown when present —
 * they are frequently the same underlying failure, but showing each under its
 * own label makes that explicit rather than hiding one. Title bar with a
 * close X, the error text, and a one-tap "Support" affordance (opens a
 * pre-filled email).
 */

type SendErrorSheetProps = {
  /** Sheet title. */
  title: string;
  /** Raw fee (`sendPreview`) RPC error, or '' when none. */
  feeError: string;
  /** Raw spendable-balance RPC error, or '' when none. */
  spendableError: string;
  /** Human labels for each section ("Fee" / "Spendable"). */
  feeLabel: string;
  spendableLabel: string;
  /** Compose the support email with the error(s) attached. */
  onSupport: () => void;
  translate: (key: string) => TranslateType;
};

const SendErrorSheet = forwardRef<BottomSheetModal, SendErrorSheetProps>(
  (
    {
      title,
      feeError,
      spendableError,
      feeLabel,
      spendableLabel,
      onSupport,
      translate,
    },
    ref,
  ) => {
    const { colors } = useTheme();

    const t = useCallback(
      (key: string, fallback: string): string =>
        (translate(key) as string) || fallback,
      [translate],
    );

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const onSupportPress = useCallback(() => {
      onSupport();
      dismiss();
    }, [onSupport, dismiss]);

    const section = (label: string, message: string) =>
      message ? (
        <View style={{ rowGap: space4 }}>
          <Text variant="caption" tone="muted">
            {label}
          </Text>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <InfoIcon size={iconSizeSm} color={colors.fgDanger} />
              <Text
                variant="bodySmall"
                style={{ flex: 1, marginLeft: space12 }}
              >
                {message}
              </Text>
            </View>
          </Card>
        </View>
      ) : null;

    return (
      <AppSheetModal
        ref={ref}
        accessible={false}
        header={
          <TitleBar
            title={title}
            right={{
              icon: XIcon,
              accessibilityLabel: title,
              onPress: dismiss,
            }}
          />
        }
        contentStyle={{
          paddingHorizontal: space20,
          paddingTop: space8,
          rowGap: space16,
        }}
      >
        {section(spendableLabel, spendableError)}
        {section(feeLabel, feeError)}
        <SheetFooter style={{ paddingHorizontal: 0 }}>
          <View style={{ marginTop: space4 }}>
            <Button
              variant="primary"
              title={t('support', 'Support')}
              onPress={onSupportPress}
              testID="send.error.support"
            />
          </View>
        </SheetFooter>
      </AppSheetModal>
    );
  },
);

export default React.memo(SendErrorSheet);
