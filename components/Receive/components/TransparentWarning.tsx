/* eslint-disable react-native/no-inline-styles */
import { useContext } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../app/theme';

import { ContextAppLoaded } from '../../../app/context';
import { TriangleAlert } from '../../Components/Icons/TriangleAlert';

type TransparentWarningProps = {
  onSuccess: () => void;
  closeSheet: () => void;
};

const TransparentWarning = ({
  onSuccess,
  closeSheet,
}: TransparentWarningProps) => {
  const { colors } = useTheme();
  const { translate } = useContext(ContextAppLoaded);

  return (
    <View
      style={{
        backgroundColor: colors.bgSurface,
      }}
    >
      <View
        style={{
          width: '90%',
          padding: 16,
          borderRadius: 8,
          backgroundColor: colors.bgSurface,
          alignSelf: 'center',
        }}
      >
        <View>
          <Text
            style={{ color: colors.fgDefault, fontSize: 16, marginBottom: 12 }}
          >
            {translate('receive.modal-transparent.message') as string}
          </Text>
          <Text
            style={{ color: colors.fgMuted, fontSize: 16, marginBottom: 16 }}
          >
            {translate('receive.modal-transparent.recommendation') as string}
          </Text>
          <TouchableOpacity
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colors.bgWarning,
              padding: 12,
              borderRadius: 8,
              borderColor: colors.borderWarning,
              borderWidth: 2,
            }}
            onPress={() => {
              onSuccess();
              closeSheet();
            }}
          >
            <TriangleAlert
              size={12}
              style={{ marginRight: 8 }}
              color={colors.fgWarningEmphasis}
            />

            <Text style={{ color: colors.fgWarningEmphasis, fontSize: 12 }}>
              {translate('receive.modal-transparent.button') as string}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default TransparentWarning;
