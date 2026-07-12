/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Keyboard, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faBolt,
  faServer,
  faWifi,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

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
  customServerAuto: boolean;
  onPressServerAuto: (v: boolean) => void;
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
  customServerAuto,
  onPressServerAuto,
  customServerChainName,
  onPressServerChainName,
  customServerUri,
  setCustomServerUri,
  usingCustomServer,
  closeSheet,
  translate,
}) => {
  const { colors } = useTheme() as ThemeType;

  // The three mutually-exclusive modes. "Custom" is the fallback when neither
  // Offline nor Automatic is active — it reveals the URI + chain inputs.
  const isCustom = !customServerOffline && !customServerAuto;
  const modes = [
    {
      key: 'offline',
      label: translate('settings.server-offline') as string,
      icon: faWifi,
      selected: customServerOffline,
      iconColor: customServerOffline ? 'red' : colors.zingo,
      onPress: () => onPressServerOffline(true),
    },
    {
      key: 'auto',
      label: translate('settings.server-auto') as string,
      icon: faBolt,
      selected: customServerAuto,
      iconColor: customServerAuto ? colors.primary : colors.zingo,
      onPress: () => onPressServerAuto(true),
    },
    {
      key: 'custom',
      label: translate('settings.server-custom') as string,
      icon: faServer,
      selected: isCustom,
      iconColor: isCustom ? colors.primary : colors.zingo,
      onPress: () => {
        onPressServerOffline(false);
        onPressServerAuto(false);
      },
    },
  ];

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bottomSheetBackground,
        paddingHorizontal: 16,
        paddingTop: 12,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {modes.map(m => (
          <TouchableOpacity
            key={m.key}
            testID={`customserver.mode.${m.key}`}
            disabled={actionButtonsDisabled}
            onPress={m.onPress}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderColor: m.selected ? colors.primary : colors.zingo,
                borderWidth: m.selected ? 2 : 1,
                borderRadius: 10,
              }}
            >
              <FontAwesomeIcon icon={m.icon} color={m.iconColor} size={14} />
              <FadeText style={{ marginLeft: 8 }}>{m.label}</FadeText>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      {isCustom && (
        <>
          <View
            style={{
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 12,
              marginHorizontal: 5,
              alignSelf: 'stretch',
              minHeight: 48,
              flexDirection: 'row',
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
                flex: 1,
                minHeight: 48,
                marginLeft: 5,
                backgroundColor: 'transparent',
              }}
              value={customServerUri}
              onChangeText={setCustomServerUri}
              editable={!actionButtonsDisabled}
              maxLength={100}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              textContentType="URL"
            />
            {customServerUri && !actionButtonsDisabled && (
              <TouchableOpacity onPress={() => setCustomServerUri('')}>
                <FontAwesomeIcon
                  style={{ marginRight: 10 }}
                  size={20}
                  icon={faXmark}
                  color={colors.primaryDisabled}
                />
              </TouchableOpacity>
            )}
          </View>
          <View
            style={{
              marginHorizontal: 5,
              alignSelf: 'stretch',
              minHeight: 48,
            }}
          >
            <View
              style={{
                paddingTop: 10,
                paddingLeft: 10,
                paddingRight: 10,
                marginBottom: 5,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ChainTypeToggle
                customServerChainName={customServerChainName}
                onPress={onPressServerChainName}
                translate={translate}
                disabled={actionButtonsDisabled}
              />
            </View>
          </View>
        </>
      )}
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 10,
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
            onPressServerAuto(false);
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
          twoButtons={true}
        />
      </View>
    </View>
  );
};

export default React.memo(CustomServer);
