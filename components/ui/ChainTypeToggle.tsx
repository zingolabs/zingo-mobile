/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../app/theme';

import { ChainNameEnum, TranslateType } from '../../app/AppState';
import RegText from './RegText';

type ChainTypeToggleProps = {
  customServerChainName: string;
  onPress: (chain: ChainNameEnum) => void;
  translate: (key: string) => TranslateType;
  disabled?: boolean;
};

const CHAINS: { value: ChainNameEnum; key: 'main' | 'test' | 'regtest' }[] = [
  { value: ChainNameEnum.mainChainName, key: 'main' },
  { value: ChainNameEnum.testChainName, key: 'test' },
  { value: ChainNameEnum.regtestChainName, key: 'regtest' },
];

const ChainTypeToggle: React.FunctionComponent<ChainTypeToggleProps> = ({
  customServerChainName,
  onPress,
  translate,
  disabled,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderAccent,
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      {CHAINS.map(c => {
        const selected = customServerChainName === c.value;
        return (
          <TouchableOpacity
            key={c.value}
            testID={`settings.custom-server-chain.${c.key}net`}
            disabled={disabled}
            onPress={() => onPress(c.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: 'center',
              backgroundColor: selected ? colors.bgAccent : 'transparent',
              borderRadius: 8,
              borderWidth: selected ? 1 : 0,
              borderColor: colors.borderAccent,
            }}
          >
            <RegText
              style={{
                color: selected ? colors.bgCanvas : colors.fgAccent,
                fontSize: 12,
              }}
            >
              {translate(`settings.value-chainname-${c.key}`) as string}
            </RegText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default ChainTypeToggle;
