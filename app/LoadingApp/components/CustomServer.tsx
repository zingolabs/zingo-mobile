/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Keyboard, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faWifi } from '@fortawesome/free-solid-svg-icons';

import {
  ButtonTypeEnum,
  ChainNameEnum,
  GlobalConst,
  TranslateType,
} from '../../AppState';
import { ThemeType } from '../../types';
import Button from '../../../components/Components/Button';
import FadeText from '../../../components/Components/FadeText';
import ChainTypeToggle from '../../../components/Components/ChainTypeToggle';

type CustomServerProps = {
  actionButtonsDisabled: boolean;
  customServerOffline: boolean;
  onPressServerOffline: (v: boolean) => void;
  customServerChainName: string;
  onPressServerChainName: (v: ChainNameEnum) => void;
  customServerUri: string;
  setCustomServerUri: (v: string) => void;
  usingCustomServer: () => void;
  closeSheet: () => void;
  translate: (key: string) => TranslateType;
};

const CustomServer: React.FunctionComponent<CustomServerProps> = ({
  actionButtonsDisabled,
  customServerOffline,
  onPressServerOffline,
  customServerChainName,
  onPressServerChainName,
  customServerUri,
  setCustomServerUri,
  usingCustomServer,
  closeSheet,
  translate,
}) => {
  const { colors } = useTheme() as ThemeType;

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bottomSheetBackground,
        paddingHorizontal: 10,
        paddingTop: 10,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          marginBottom: 10,
          paddingHorizontal: 5,
          paddingVertical: 1,
          borderColor: customServerOffline ? colors.primary : colors.zingo,
          borderWidth: customServerOffline ? 2 : 1,
          borderRadius: 10,
          minWidth: 25,
          minHeight: 25,
        }}
      >
        <TouchableOpacity
          onPress={() => onPressServerOffline(!customServerOffline)}
        >
          <View style={{ flexDirection: 'row', margin: 0, padding: 0 }}>
            <FontAwesomeIcon
              icon={faWifi}
              color={customServerOffline ? 'red' : colors.zingo}
              size={14}
            />
            <FadeText style={{ marginLeft: 10, marginRight: 5 }}>
              {translate('settings.server-offline') as string}
            </FadeText>
          </View>
        </TouchableOpacity>
      </View>
      {!customServerOffline && (
        <>
          <ChainTypeToggle
            customServerChainName={customServerChainName}
            onPress={onPressServerChainName}
            translate={translate}
            disabled={actionButtonsDisabled}
          />
          <View
            style={{
              borderColor: colors.border,
              borderWidth: 1,
              marginBottom: 10,
              width: '100%',
              maxWidth: '100%',
              minWidth: '50%',
              minHeight: 48,
              alignItems: 'center',
            }}
          >
            <TextInput
              placeholder={GlobalConst.serverPlaceHolder}
              placeholderTextColor={colors.placeholder}
              style={{
                color: colors.text,
                fontWeight: '600',
                fontSize: 18,
                minWidth: '90%',
                minHeight: 48,
                marginLeft: 5,
                backgroundColor: 'transparent',
              }}
              value={customServerUri}
              onChangeText={setCustomServerUri}
              editable={!actionButtonsDisabled}
              maxLength={100}
            />
          </View>
        </>
      )}
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
          marginTop: 15,
        }}
      >
        <Button
          type={ButtonTypeEnum.Secondary}
          title={translate('cancel') as string}
          disabled={actionButtonsDisabled}
          onPress={() => {
            onPressServerOffline(false);
            onPressServerChainName(ChainNameEnum.mainChainName);
            setCustomServerUri('');
            Keyboard.dismiss();
            closeSheet();
          }}
          twoButtons={true}
        />
        <Button
          type={ButtonTypeEnum.Primary}
          title={translate('save') as string}
          disabled={actionButtonsDisabled}
          onPress={() => {
            usingCustomServer();
            Keyboard.dismiss();
          }}
          style={{ marginLeft: 10 }}
          twoButtons={true}
        />
      </View>
    </View>
  );
};

export default React.memo(CustomServer);
