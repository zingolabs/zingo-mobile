/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text as RNText } from 'react-native';
import {
  radiusMd,
  space12,
  space16,
  space8,
  touchTarget,
  useTheme,
} from '@app/theme';
import { ToastConfigParams } from 'react-native-toast-message';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import { SnackbarActionType } from '@app/AppState';

/** How long a toast with an action stays: long enough to reach it. */
export const ACTION_SNACKBAR_MS = 4200;

const AppInfoToast: React.FC<ToastConfigParams<undefined>> = ({ text1 }) => {
  const { colors } = useTheme();
  return (
    <View style={{ width: '100%', paddingHorizontal: 10 }}>
      <View
        style={{
          backgroundColor: colors.bgSurface,
          paddingLeft: 20,
          paddingRight: 15,
          paddingVertical: 10,
          borderWidth: 0.5,
          borderColor: colors.borderMuted,
          borderRadius: 6,
        }}
      >
        <RNText style={{ color: colors.fgDefault, fontSize: 15 }}>
          {text1}
        </RNText>
      </View>
    </View>
  );
};

const AppActionToast: React.FC<ToastConfigParams<SnackbarActionType>> = ({
  text1,
  props,
  hide,
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ width: '100%', paddingHorizontal: space16 }}>
      <View
        testID="toast.action"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space8,
          minHeight: touchTarget,
          paddingLeft: space16,
          paddingRight: space8,
          paddingVertical: space8,
          backgroundColor: colors.bgSurface,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          borderRadius: radiusMd,
        }}
      >
        <Text variant="bodySmall" style={{ flex: 1 }}>
          {text1}
        </Text>
        <Button
          testID="toast.action.button"
          variant="text"
          size="small"
          inline
          style={{ paddingHorizontal: space12 }}
          title={props.label}
          onPress={() => {
            hide();
            props.onPress();
          }}
        />
      </View>
    </View>
  );
};

export const toastConfig = {
  appInfo: (props: ToastConfigParams<undefined>) => <AppInfoToast {...props} />,
  appAction: (props: ToastConfigParams<SnackbarActionType>) => (
    <AppActionToast {...props} />
  ),
};
