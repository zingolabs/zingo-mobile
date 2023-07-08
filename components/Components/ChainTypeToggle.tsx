/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../../app/types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCashRegister } from '@fortawesome/free-solid-svg-icons';
import { TranslateType } from '../../app/AppState';

type ChainTypeToggleProps = {
  customServerChainName: string;
  onPress: (chain: 'main' | 'test' | 'regtest') => void;
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
      <TouchableOpacity style={{ marginHorizontal: 5 }} onPress={() => onPress('main')}>
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
              borderWidth: customServerChainName === 'main' ? 2 : 1,
              borderColor: customServerChainName === 'main' ? colors.primary : colors.primaryDisabled,
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
            {customServerChainName === 'main' && (
              <FontAwesomeIcon icon={faCashRegister} size={14} color={colors.primary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity testID="settings.chaintype.test" style={{ marginHorizontal: 5 }} onPress={() => onPress('test')}>
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
              borderWidth: customServerChainName === 'test' ? 2 : 1,
              borderColor: customServerChainName === 'test' ? colors.primary : colors.primaryDisabled,
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
            {customServerChainName === 'test' && (
              <FontAwesomeIcon icon={faCashRegister} size={14} color={colors.primary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={{ marginHorizontal: 5 }} onPress={() => onPress('regtest')}>
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
              borderWidth: customServerChainName === 'regtest' ? 2 : 1,
              borderColor: customServerChainName === 'regtest' ? colors.primary : colors.primaryDisabled,
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
            {customServerChainName === 'regtest' && (
              <FontAwesomeIcon icon={faCashRegister} size={14} color={colors.primary} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default ChainTypeToggle;
