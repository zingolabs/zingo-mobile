/* eslint-disable react-native/no-inline-styles */
import { useContext } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import { TriangleAlert } from '../../Components/Icons/TriangleAlert';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import RegText from '../../Components/RegText';


type TransparentWarningProps = {
  onSuccess: () => void;
  closeSheet: () => void;
  setHeightLayout: (h: number) => void;
};

const TransparentWarning = ({ onSuccess, closeSheet, setHeightLayout }: TransparentWarningProps) => {
  const { colors } = useTheme() as ThemeType;
  const { translate } = useContext(ContextAppLoaded);

  return (
    <View 
      onLayout={e => {
        const { height } = e.nativeEvent.layout;
        //console.log('LAYOUTTT', height);
        setHeightLayout(height + 70);
      }}
      style={{ 
        backgroundColor: colors.background,
      }}>
      <TouchableOpacity
        onPress={() => {
          closeSheet();
        }}>
        <FontAwesomeIcon
            size={30}
            icon={faXmark}
            color={colors.text}
            style={{ marginTop: 10, marginRight: 20, alignSelf: 'flex-end' }}
        />
      </TouchableOpacity>
      <RegText style={{ marginTop: 0, paddingHorizontal: 10, alignSelf: 'center' }}>
        {translate('receive.modal-transparent.title') as string}
      </RegText>
      <View
        style={{
          width: '90%',
          padding: 16,
          borderRadius: 8,
          backgroundColor: colors.background,
          alignSelf: 'center',
        }}>
        <View>
          <Text style={{ color: colors.money, fontSize: 16, marginBottom: 12 }}>
            {translate('receive.modal-transparent.message') as string}
          </Text>
          <Text style={{ color: colors.zingo, fontSize: 16, marginBottom: 16 }}>
            {translate('receive.modal-transparent.recommendation') as string}
          </Text>
          <TouchableOpacity
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colors.warning.background,
              padding: 12,
              borderRadius: 8,
              borderColor: colors.warning.border,
              borderWidth: 2,
            }}
            onPress={() => {
              onSuccess();
              closeSheet();
            }}>
            <TriangleAlert size={15} style={{ marginRight: 8 }} color={colors.warning.title} />

            <Text style={{ color: colors.warning.title, fontSize: 12 }}>
              {translate('receive.modal-transparent.button') as string}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default TransparentWarning;