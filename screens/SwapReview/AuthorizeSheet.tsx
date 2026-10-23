/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useContext } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { space16, space8, useTheme, radiusPill, iconSize } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { askGate, enactGateAnswer } from '@app/services/gateController';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import { FingerprintIcon } from '@ui/primitives/Icons/FingerprintIcon';

type AuthorizeSheetProps = {
  /** What the deposit sends and to whom, for the line under the title. */
  summary: string;
  onAuthorized: () => void;
};

/**
 * The device lock before a deposit leaves the wallet, asked when Confirm is
 * pressed. A refusal leaves the review as it was.
 */
const AuthorizeSheet = forwardRef<BottomSheetModal, AuthorizeSheetProps>(
  ({ summary, onAuthorized }, ref) => {
    const { translate, addLastSnackbar } = useContext(ContextAppLoaded);
    const { colors } = useTheme();
    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const authorize = useCallback(async () => {
      const answer = await askGate({ translate });
      const proceed = enactGateAnswer(
        answer,
        {
          lock: () => addLastSnackbar(translate('biometrics-error') as string),
          notice: addLastSnackbar,
        },
        translate,
      );
      dismiss();
      if (proceed) {
        onAuthorized();
      }
    }, [translate, addLastSnackbar, dismiss, onAuthorized]);

    return (
      <AppSheetModal ref={ref} handle contentStyle={{ paddingBottom: 32 }}>
        <View
          style={{
            alignItems: 'center',
            paddingHorizontal: space16,
            paddingTop: space8,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radiusPill,
              backgroundColor: colors.bgAccentSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FingerprintIcon size={iconSize} color={colors.fgAccent} />
          </View>
          <Text variant="subtitle" style={{ marginTop: space16 }}>
            {translate('swap.auth-title') as string}
          </Text>
          <Text
            variant="caption"
            tone="muted"
            style={{ marginTop: 8, textAlign: 'center' }}
          >
            {summary}
          </Text>
          <View style={{ alignSelf: 'stretch', marginTop: 16 }}>
            <ButtonStack>
              <Button
                variant="quiet"
                title={translate('swap.cancel') as string}
                onPress={dismiss}
              />
              <Button
                testID="swap.auth.ok"
                variant="primary"
                title={translate('swap.auth-use') as string}
                onPress={authorize}
              />
            </ButtonStack>
          </View>
        </View>
      </AppSheetModal>
    );
  },
);

export default AuthorizeSheet;
