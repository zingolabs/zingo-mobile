/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useState } from 'react';
import { Dimensions, Pressable } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import Scanner from '../../Scanner';
import { GlobalConst } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';

type ScannerAddressSheetProps = {
  // Non-ZEC chains take the scanned string verbatim; ZEC gets the same
  // `zcash:` normalization the standalone ScannerAddress screen applies.
  raw: boolean;
  // Receives the (normalized) scanned address, after which the sheet closes.
  onRead: (address: string) => void;
};

/**
 * The QR scanner presented as a stacked BottomSheetModal instead of a
 * navigation screen. Hosts already living inside a BottomSheetModal (e.g. the
 * address-book detail) can't navigate to the ScannerAddress screen: leaving the
 * screen blurs and dismisses their own sheet. Presenting the camera as a sheet
 * on top (stackBehavior="push") keeps the host mounted, so the scanned address
 * lands straight back into its field — the way every other picker in the app
 * works.
 */
const ScannerAddressSheet = forwardRef<
  React.ComponentRef<typeof BottomSheetModal>,
  ScannerAddressSheetProps
>(({ raw, onRead }, ref) => {
  const { colors } = useTheme() as ThemeType;
  // The camera holds hardware while active; only run it while the sheet is open.
  const [active, setActive] = useState<boolean>(false);
  const height = Math.round(Dimensions.get('window').height * 0.82);

  const dismiss = useCallback(() => {
    (
      ref as React.RefObject<React.ComponentRef<typeof BottomSheetModal>>
    )?.current?.dismiss();
  }, [ref]);

  const normalize = (scanned: string): string => {
    if (raw) {
      return scanned;
    }
    if (
      scanned.toLowerCase().startsWith(GlobalConst.zcash) ||
      scanned.toLowerCase().includes(':')
    ) {
      return scanned;
    }
    return GlobalConst.zcash + scanned;
  };

  const handleRead = (scandata: string) => {
    if (!scandata) {
      return;
    }
    onRead(normalize(scandata));
    dismiss();
  };

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

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing={true}
      enablePanDownToClose
      stackBehavior="push"
      onChange={index => setActive(index >= 0)}
      handleComponent={null}
      backgroundStyle={{
        backgroundColor: colors.background,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
      }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView
        style={{
          height,
          backgroundColor: colors.background,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          overflow: 'hidden',
        }}
      >
        <Scanner active={active} onRead={handleRead} onClose={dismiss} />
        <Pressable
          onPress={dismiss}
          hitSlop={12}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Close scanner"
          accessibilityRole="button"
        >
          <FontAwesomeIcon icon={faXmark} size={22} color={'#FFFFFF'} />
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default React.memo(ScannerAddressSheet);
