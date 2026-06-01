/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { ChainNameEnum, TranslateType } from '../../AppState';
import { ThemeType } from '../../types';
import BoldText from '../../../components/Components/BoldText';
import CustomServer from './CustomServer';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';

type CustomServerModalHostProps = {
  actionButtonsDisabled: boolean;
  customServerOffline: boolean;
  onPressServerOffline: (v: boolean) => void;
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
      customServerChainName,
      onPressServerChainName,
      customServerUri,
      setCustomServerUri,
      usingCustomServer,
      translate,
    },
    ref,
  ) => {
    const { colors } = useTheme() as ThemeType;
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
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            borderTopWidth: 1,
            borderLeftWidth: 0.5,
            borderRightWidth: 0.5,
            borderTopColor: colors.bottomSheetBorder,
            borderLeftColor: colors.bottomSheetBorder,
            borderRightColor: colors.bottomSheetBorder,
          }}
        >
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
              <FontAwesomeIcon icon={faXmark} size={20} color={colors.zingo} />
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
        handleComponent={renderHandle}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bottomSheetBackground,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 30,
          }}
        >
          <CustomServer
            actionButtonsDisabled={actionButtonsDisabled}
            customServerOffline={customServerOffline}
            onPressServerOffline={onPressServerOffline}
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
