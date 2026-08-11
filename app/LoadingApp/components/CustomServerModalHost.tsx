/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { useTheme } from '../../theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { ChainNameEnum, TranslateType } from '../../AppState';
import BoldText from '../../../ui/primitives/BoldText';
import SheetRim from '../../../ui/primitives/SheetRim';
import CustomServer from './CustomServer';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';

type CustomServerModalHostProps = {
  actionButtonsDisabled: boolean;
  customServerOffline: boolean;
  onPressServerOffline: (v: boolean) => void;
  customServerAuto: boolean;
  onPressServerAuto: (v: boolean) => void;
  customServerChainName: string;
  onPressServerChainName: (v: ChainNameEnum) => void;
  customServerUri: string;
  setCustomServerUri: (v: string) => void;
  usingCustomServer: () => void;
  translate: (key: string) => TranslateType;
};

const CustomServerModalHost = forwardRef<
  React.ComponentRef<typeof BottomSheetModal>,
  CustomServerModalHostProps
>(
  (
    {
      actionButtonsDisabled,
      customServerOffline,
      onPressServerOffline,
      customServerAuto,
      onPressServerAuto,
      customServerChainName,
      onPressServerChainName,
      customServerUri,
      setCustomServerUri,
      usingCustomServer,
      translate,
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const keyboardHeight = useKeyboardHeight();

    const dismiss = useCallback(() => {
      (
        ref as React.RefObject<React.ComponentRef<typeof BottomSheetModal>>
      )?.current?.dismiss();
    }, [ref]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      [],
    );

    const renderHandle = useCallback(
      () => (
        <View
          style={{
            paddingTop: 8,
            paddingBottom: 6,
            paddingHorizontal: 16,
            backgroundColor: colors.bgSurface,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
          }}
        >
          <SheetRim />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Left spacer width matches the X Pressable's measured width
                (paddingHorizontal: 14 × 2 + icon size 20 = 48) so the
                title stays perfectly centered. The BoldText flex-fills
                the middle space so a long localized title ellipsizes
                instead of being clipped. */}
            <View style={{ width: 48 }} />
            <BoldText
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 16,
                lineHeight: 28,
                textAlign: 'center',
              }}
            >
              {translate('settings.server-title') as string}
            </BoldText>
            <Pressable
              onPress={dismiss}
              hitSlop={8}
              style={{ paddingHorizontal: 14, paddingVertical: 4 }}
            >
              <FontAwesomeIcon icon={faXmark} size={20} color={colors.fgMuted} />
            </Pressable>
          </View>
        </View>
      ),
      [colors, dismiss, translate],
    );

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing={true}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        onAnimate={(from, to) => {
          // Opening (from === -1) dismisses a keyboard left open by the
          // underlying screen so the sheet never renders behind it. Guard
          // avoids fighting a keyboard the sheet itself focuses later.
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        handleComponent={renderHandle}
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bgSurface,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
          }}
        >
          <CustomServer
            actionButtonsDisabled={actionButtonsDisabled}
            customServerOffline={customServerOffline}
            onPressServerOffline={onPressServerOffline}
            customServerAuto={customServerAuto}
            onPressServerAuto={onPressServerAuto}
            customServerChainName={customServerChainName}
            onPressServerChainName={onPressServerChainName}
            customServerUri={customServerUri}
            setCustomServerUri={setCustomServerUri}
            usingCustomServer={usingCustomServer}
            closeSheet={dismiss}
            translate={translate}
          />
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

export default React.memo(CustomServerModalHost);
