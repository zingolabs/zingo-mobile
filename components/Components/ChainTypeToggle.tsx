/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../../app/types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCashRegister } from '@fortawesome/free-solid-svg-icons';
import { ChainNameEnum, TranslateType } from '../../app/AppState';

type ChainTypeToggleProps = {
  customServerChainName: string;
  onPress: (chain: ChainNameEnum) => void;
  translate: (key: string) => TranslateType;
};

const ChainTypeToggle: React.FunctionComponent<ChainTypeToggleProps> = ({
  customServerChainName,
  onPress,
  translate,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
      <TouchableOpacity
        testID="settings.custom-server-chain.mainnet"
        style={{ marginHorizontal: 5 }}
        onPress={() => onPress(ChainNameEnum.main)}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10,
          }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: customServerChainName === ChainNameEnum.main ? 2 : 1,
              borderColor: customServerChainName === ChainNameEnum.main ? colors.primary : colors.primaryDisabled,
              borderRadius: 5,
              paddingHorizontal: 5,
            }}>
            <Text
              style={{
                fontSize: 13,
                color: colors.border,
                marginRight: 5,
              }}>
              {translate('settings.value-chain_name-main') as string}
            </Text>
            {customServerChainName === ChainNameEnum.main && (
              <FontAwesomeIcon icon={faCashRegister} size={14} color={colors.primary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        testID="settings.custom-server-chain.testnet"
        style={{ marginHorizontal: 5 }}
        onPress={() => onPress(ChainNameEnum.test)}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10,
          }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: customServerChainName === ChainNameEnum.test ? 2 : 1,
              borderColor: customServerChainName === ChainNameEnum.test ? colors.primary : colors.primaryDisabled,
              borderRadius: 5,
              paddingHorizontal: 5,
            }}>
            <Text
              style={{
                fontSize: 13,
                color: colors.border,
                marginRight: 5,
              }}>
              {translate('settings.value-chain_name-test') as string}
            </Text>
            {customServerChainName === ChainNameEnum.test && (
              <FontAwesomeIcon icon={faCashRegister} size={14} color={colors.primary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        testID="settings.custom-server-chain.regtest"
        style={{ marginHorizontal: 5 }}
        onPress={() => onPress(ChainNameEnum.regtest)}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10,
          }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: customServerChainName === ChainNameEnum.regtest ? 2 : 1,
              borderColor: customServerChainName === ChainNameEnum.regtest ? colors.primary : colors.primaryDisabled,
              borderRadius: 5,
              paddingHorizontal: 5,
            }}>
            <Text
              style={{
                fontSize: 13,
                color: colors.border,
                marginRight: 5,
              }}>
              {translate('settings.value-chain_name-regtest') as string}
            </Text>
            {customServerChainName === ChainNameEnum.regtest && (
              <FontAwesomeIcon icon={faCashRegister} size={14} color={colors.primary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default ChainTypeToggle;
