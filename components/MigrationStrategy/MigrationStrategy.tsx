/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum } from '../../app/AppState';
import Utils from '../../app/utils';

type MigrationStrategyProps = NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MigrationStrategy
>;

// The two migration paths ZIP 318 offers. Only the immediate drain is wired
// up for now; the scheduled/private path is presented as coming soon.
type StrategyOption = 'now' | 'private';

// Renders a translated string, bolding the spans wrapped in `**` so a single
// translation keeps its natural word order per language.
const BoldSplitText: React.FunctionComponent<{
  text: string;
  color: string;
  highlight: string;
  fontSize: number;
  lineHeight: number;
  marginBottom?: number;
}> = ({ text, color, highlight, fontSize, lineHeight, marginBottom = 0 }) => (
  <Text style={{ color, fontSize, lineHeight, marginBottom }}>
    {text.split('**').map((part: string, i: number) =>
      i % 2 === 1 ? (
        <Text key={i} style={{ color: highlight, fontWeight: '700' }}>
          {part}
        </Text>
      ) : (
        <Text key={i}>{part}</Text>
      ),
    )}
  </Text>
);

// A single-selectable radio indicator: an outlined circle that fills when
// selected.
const RadioDot: React.FunctionComponent<{
  selected: boolean;
  activeColor: string;
  inactiveColor: string;
}> = ({ selected, activeColor, inactiveColor }) => (
  <View
    style={{
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: selected ? activeColor : inactiveColor,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {selected ? (
      <View
        style={{
          width: 11,
          height: 11,
          borderRadius: 6,
          backgroundColor: activeColor,
        }}
      />
    ) : null}
  </View>
);

type OptionCardProps = {
  title: string;
  body: string;
  selected: boolean;
  onPress: () => void;
  colors: ThemeType['colors'];
  disabled?: boolean;
  badge?: string;
};

const OptionCard: React.FunctionComponent<OptionCardProps> = ({
  title,
  body,
  selected,
  onPress,
  colors,
  disabled = false,
  badge,
}) => (
  <TouchableOpacity
    activeOpacity={disabled ? 1 : 0.8}
    disabled={disabled}
    onPress={onPress}
    style={{
      borderWidth: 1.5,
      borderColor: selected ? colors.primary : colors.bottomSheetBorder,
      backgroundColor: colors.bottomSheetBackground,
      borderRadius: 14,
      padding: 18,
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}
      >
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
          {title}
        </Text>
        {badge ? (
          <View
            style={{
              marginLeft: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <Text style={{ color: colors.placeholder, fontSize: 12 }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <RadioDot
        selected={selected}
        activeColor={colors.primary}
        inactiveColor={colors.placeholder}
      />
    </View>
    <BoldSplitText
      text={body}
      color={colors.placeholder}
      highlight={colors.text}
      fontSize={14}
      lineHeight={21}
    />
  </TouchableOpacity>
);

const MigrationStrategy: React.FunctionComponent<MigrationStrategyProps> = ({
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, totalBalance, info } = context;
  const { colors } = useTheme() as ThemeType;
  const [selected, setSelected] = useState<StrategyOption>('now');

  // Orchard balance shown so the user sees what would cross the pool boundary
  // (and become publicly visible) on the immediate path.
  const orchardAmount = totalBalance ? totalBalance.totalOrchardBalance : 0;
  const amountStr = `${Utils.parseNumberFloatToStringLocale(
    orchardAmount,
    4,
  )} ${info.currencyName}`;
  const nowBody = (translate('migrationstrategy.now-body') as string).replace(
    '{amount}',
    amountStr,
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: 24,
        }}
      >
        <BoldText
          style={{ fontSize: 22, textAlign: 'center', marginBottom: 28 }}
        >
          {translate('migrationstrategy.title') as string}
        </BoldText>

        <BoldSplitText
          text={translate('migrationstrategy.intro') as string}
          color={colors.placeholder}
          highlight={colors.text}
          fontSize={16}
          lineHeight={24}
          marginBottom={28}
        />

        <OptionCard
          title={translate('migrationstrategy.private-label') as string}
          body={translate('migrationstrategy.private-body') as string}
          selected={false}
          onPress={() => {}}
          colors={colors}
          disabled={true}
          badge={translate('migrationstrategy.coming-soon') as string}
        />
        <View style={{ height: 14 }} />
        <OptionCard
          title={translate('migrationstrategy.now-label') as string}
          body={nowBody}
          selected={selected === 'now'}
          onPress={() => setSelected('now')}
          colors={colors}
        />
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          paddingBottom: 24,
          paddingHorizontal: 24,
        }}
      >
        <Button
          testID="migrationstrategy.back"
          type={ButtonTypeEnum.Secondary}
          title={translate('migrationstrategy.back') as string}
          onPress={() => navigation.goBack()}
          twoButtons={true}
          style={{ backgroundColor: 'transparent' }}
        />
        <Button
          testID="migrationstrategy.start"
          type={ButtonTypeEnum.Primary}
          title={translate('migrationstrategy.start') as string}
          onPress={() => navigation.navigate(RouteEnum.MigrationTransactions)}
          twoButtons={true}
          disabled={selected !== 'now'}
        />
      </View>
    </View>
  );
};

export default MigrationStrategy;
