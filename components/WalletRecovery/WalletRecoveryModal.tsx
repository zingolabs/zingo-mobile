/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, Platform, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { useTheme } from '../../app/theme';
import { ButtonTypeEnum } from '../../app/AppState';
import { TranslateType } from '../../app/AppState/types/TranslateType';
import BoldText from '../Components/BoldText';
import RegText from '../Components/RegText';
import Button from '../Components/Button';

type WalletRecoveryModalProps = {
  visible: boolean;
  title: string;
  // Short human explanation shown above the per-file states.
  message: string;
  // One line per wallet file, e.g. "wallet.dat: encrypted twice".
  diagnosisLines: string;
  translate: (key: string) => TranslateType;
  // The primary action; it does not close the sheet.
  onCopy: () => void;
  // Absent hides the button (no intact backup to restore).
  onRestoreBackup?: () => void;
  onSupport: () => void;
  onCancel: () => void;
  // Fires on any dismissal, including the Android back button.
  onDismiss?: () => void;
};

const VERTICAL_LIFT = Math.round(Dimensions.get('window').height * 0.22);
const MONO = Platform.select({ ios: 'Courier', default: 'monospace' });

const WalletRecoveryModal: React.FunctionComponent<
  WalletRecoveryModalProps
> = ({
  visible,
  title,
  message,
  diagnosisLines,
  translate,
  onCopy,
  onRestoreBackup,
  onSupport,
  onCancel,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  // No swipe or backdrop tap; a button or the Android back button closes it.
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="none"
      />
    ),
    [],
  );

  const renderHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 10,
          paddingHorizontal: 16,
          backgroundColor: colors.bgSurface,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.bottomSheetBorder,
        }}
      >
        <BoldText
          numberOfLines={2}
          style={{ fontSize: 16, lineHeight: 24, textAlign: 'center' }}
        >
          {title}
        </BoldText>
      </View>
    ),
    [colors, title],
  );

  return (
    <BottomSheetModal
      ref={ref}
      accessible={false}
      enableDynamicSizing={true}
      enablePanDownToClose={false}
      stackBehavior="push"
      detached={true}
      bottomInset={VERTICAL_LIFT}
      handleComponent={renderHandle}
      style={{
        marginHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        overflow: 'hidden',
      }}
      backgroundStyle={{ backgroundColor: colors.bgSurface, borderRadius: 20 }}
      backdropComponent={renderBackdrop}
      onDismiss={onDismiss}
    >
      <BottomSheetView
        style={{
          backgroundColor: colors.bgSurface,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 22,
        }}
      >
        <RegText style={{ fontSize: 14, lineHeight: 21, marginBottom: 12 }}>
          {message}
        </RegText>

        {!!diagnosisLines && (
          <RegText
            color={colors.fgMuted}
            style={{
              fontFamily: MONO,
              fontSize: 12,
              lineHeight: 18,
              marginBottom: 18,
            }}
          >
            {diagnosisLines}
          </RegText>
        )}

        <View style={{ alignItems: 'center', gap: 10 }}>
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('copy') as string}
            onPress={onCopy}
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {onRestoreBackup && (
              <Button
                type={ButtonTypeEnum.Secondary}
                title={
                  translate('loadingapp.walletrecovery-restorebackup') as string
                }
                onPress={onRestoreBackup}
                twoButtons={true}
              />
            )}
            <Button
              type={ButtonTypeEnum.Secondary}
              title={translate('support') as string}
              onPress={onSupport}
              twoButtons={!!onRestoreBackup}
            />
          </View>
          <Button
            type={ButtonTypeEnum.Ghost}
            title={translate('cancel') as string}
            onPress={onCancel}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export default WalletRecoveryModal;
