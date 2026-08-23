/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../app/theme';
import { faLock, faLockOpen } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { SnackbarDurationEnum, TranslateType } from '../../../app/AppState';

type PrivacyToggleProps = {
  privacy: boolean;
  setPrivacyOption: (value: boolean) => Promise<void>;
  addLastSnackbar: (message: string, duration?: SnackbarDurationEnum) => void;
  translate: (key: string) => TranslateType;
};

const PrivacyToggle: React.FC<PrivacyToggleProps> = React.memo(
  ({ privacy, setPrivacyOption, addLastSnackbar, translate }) => {
    const { colors } = useTheme();

    return (
      <TouchableOpacity
        onPress={() => {
          addLastSnackbar(
            `${translate('change-privacy')} ${
              privacy
                ? translate('settings.value-privacy-false')
                : (((translate('settings.value-privacy-true') as string) +
                    translate('change-privacy-legend')) as string)
            }`,
          );
          setPrivacyOption(!privacy);
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.bgCanvas,
              padding: 0,
              minWidth: 25,
              minHeight: 25,
            }}
          >
            {privacy ? (
              <FontAwesomeIcon
                icon={faLock}
                size={20}
                color={colors.fgAccent}
              />
            ) : (
              <FontAwesomeIcon
                icon={faLockOpen}
                size={20}
                color={colors.fgAccentDisabled}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

export default PrivacyToggle;
