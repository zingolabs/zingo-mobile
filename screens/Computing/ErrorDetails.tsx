/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import Clipboard from '@react-native-clipboard/clipboard';
import { iconSizeSm, radiusMd, useTheme } from '@app/theme';
import { useUnfold } from '@app/hooks/useUnfold';
import { ContextAppLoaded } from '@app/context';
import { SnackbarDurationEnum } from '@app/AppState';
import { sendEmail } from '@app/services/sendEmail';
import Button from '@ui/primitives/Button';
import Pressable from '@ui/primitives/Pressable';
import Text from '@ui/primitives/Text';
import { ChevronDown, ChevronUp } from '@ui/primitives/Icons/Chevron';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { MailIcon } from '@ui/primitives/Icons/MailIcon';

const Unfolding = ({ children }: { children: React.ReactNode }) => {
  const unfold = useUnfold();
  return (
    <Animated.View style={[{ alignSelf: 'stretch' }, unfold]}>
      {children}
    </Animated.View>
  );
};

/** The raw error of a send, unfolded on demand, to copy or to mail to support. */
export default function ErrorDetails({
  subject,
  text,
}: {
  subject: string;
  text: string;
}) {
  const { colors } = useTheme();
  const { translate, addLastSnackbar, zingolibVersion } =
    useContext(ContextAppLoaded);
  const [open, setOpen] = useState<boolean>(false);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={{ marginTop: 14, alignSelf: 'stretch', alignItems: 'center' }}>
      <Pressable
        kind="link"
        testID="computing.error.toggle"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(v => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          columnGap: 4,
          minHeight: 36,
          paddingHorizontal: 8,
        }}
      >
        <Text variant="caption" tone="muted">
          {translate('loadedapp.transactionfailed-details') as string}
        </Text>
        <Chevron size={iconSizeSm} color={colors.fgMuted} />
      </Pressable>
      {open && (
        <Unfolding>
          <View
            style={{
              marginTop: 6,
              paddingVertical: 12,
              paddingLeft: 14,
              paddingRight: 44,
              borderRadius: radiusMd,
              borderWidth: 1,
              borderColor: colors.bottomSheetBorder,
              backgroundColor: colors.bgCanvas,
            }}
          >
            <Text testID="computing.error.text" variant="address" selectable>
              {text}
            </Text>
            <Pressable
              kind="icon"
              testID="computing.error.copy"
              accessibilityRole="button"
              accessibilityLabel={translate('copy') as string}
              onPress={() => {
                Clipboard.setString(text);
                addLastSnackbar(
                  translate('txtcopied') as string,
                  SnackbarDurationEnum.short,
                );
              }}
              style={{
                position: 'absolute',
                right: 4,
                top: 4,
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CopyIcon size={iconSizeSm} color={colors.fgMuted} />
            </Pressable>
          </View>
          <View style={{ marginTop: 4, alignItems: 'center' }}>
            <Button
              testID="computing.error.email"
              variant="text"
              icon={MailIcon}
              title={translate('support') as string}
              onPress={() =>
                sendEmail(translate, zingolibVersion, subject, text)
              }
            />
          </View>
        </Unfolding>
      )}
    </View>
  );
}
