/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext } from 'react';
import { Image, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import Button from '@ui/primitives/Button';
import SheetRim from '@ui/primitives/SheetRim';
import MixnetIcon from '@ui/primitives/Icons/MixnetIcon';
import { ContextAppLoaded } from '@app/context';
import { ButtonTypeEnum } from '@app/AppState';
import { radiusSheet, useTheme } from '@app/theme';
import { NymGateState } from './nymGateState';

const NYM_GREEN = '#07FF94';

type NymGateSheetProps = {
  // The one gate state to present: connecting waits, failed shows its key.
  gate: NymGateState;
  onDismiss: () => void;
  onContinue: () => void;
  onEnable: () => void;
};

// The Mixnet Mode gate before a migration starts: enable the transport, or
// continue without it.
const NymGateSheet = forwardRef<BottomSheetModal, NymGateSheetProps>(
  ({ gate, onDismiss, onContinue, onEnable }, ref) => {
    const { translate } = useContext(ContextAppLoaded);
    const { colors } = useTheme();

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing={true}
        enablePanDownToClose
        handleComponent={null}
        stackBehavior="push"
        backgroundStyle={{
          backgroundColor: colors.bgSurface,
          borderTopLeftRadius: radiusSheet,
          borderTopRightRadius: radiusSheet,
        }}
        backdropComponent={renderBackdrop}
        onDismiss={onDismiss}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bgSurface,
            borderTopLeftRadius: radiusSheet,
            borderTopRightRadius: radiusSheet,
            paddingHorizontal: 28,
            paddingTop: 28,
            paddingBottom: 40,
            alignItems: 'center',
          }}
        >
          <SheetRim />
          <Image
            source={require('../../../assets/img/nym-mixnet.png')}
            style={{ width: 95, height: 95, marginBottom: 24 }}
            resizeMode="contain"
          />
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              textAlign: 'center',
              color: colors.fgDefault,
              marginBottom: 18,
            }}
          >
            {(translate('migrationstrategy.nym-gate-title') as string)
              .split(/(NYM)/g)
              .map((part, i) =>
                part === 'NYM' ? (
                  <Text key={i} style={{ color: NYM_GREEN }}>
                    {part}
                  </Text>
                ) : (
                  part
                ),
              )}
          </Text>
          <Text
            style={{
              fontSize: 16,
              lineHeight: 24,
              textAlign: 'left',
              alignSelf: 'stretch',
              color: colors.fgMuted,
              marginBottom: 28,
            }}
          >
            {translate('migrationstrategy.nym-gate-body') as string}
          </Text>
          {gate.kind === 'connecting' ? (
            <View style={{ marginBottom: 20 }}>
              <MixnetIcon phase="connecting" />
            </View>
          ) : gate.kind === 'failed' ? (
            <Text
              style={{
                fontSize: 15,
                textAlign: 'center',
                color: colors.fgDanger,
                marginBottom: 20,
              }}
            >
              {translate(gate.failureKey) as string}
            </Text>
          ) : null}
          <Button
            testID="migrationstrategy.nym-continue"
            type={ButtonTypeEnum.Ghost}
            title={translate('migrationstrategy.nym-gate-continue') as string}
            onPress={onContinue}
            style={{ marginBottom: 10 }}
          />
          <Button
            testID="migrationstrategy.nym-enable"
            type={ButtonTypeEnum.Primary}
            title={
              gate.kind === 'connecting'
                ? (translate('migrationstrategy.nym-gate-connecting') as string)
                : (translate('migrationstrategy.nym-gate-enable') as string)
            }
            disabled={gate.kind === 'connecting'}
            onPress={onEnable}
            style={{ width: '100%' }}
          />
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

NymGateSheet.displayName = 'NymGateSheet';

export default NymGateSheet;
