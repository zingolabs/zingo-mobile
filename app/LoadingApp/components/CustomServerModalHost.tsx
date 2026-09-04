/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { ChainNameEnum, TranslateType } from '@app/AppState';
import BoldText from '@ui/primitives/BoldText';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import CustomServer from './CustomServer';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';

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

    const serverHeader = (
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 6,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
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
    );

    return (
      <AppSheetModal
        ref={ref}
        header={serverHeader}
        contentStyle={{
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
      </AppSheetModal>
    );
  },
);

export default React.memo(CustomServerModalHost);
