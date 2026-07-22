/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';

type StepCircleProps = {
  label: string;
  done: boolean;
  active: boolean;
  colors: ThemeType['colors'];
};

const StepCircle: React.FunctionComponent<StepCircleProps> = ({
  label,
  done,
  active,
  colors,
}) => {
  const color = done || active ? colors.primary : colors.placeholder;
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {done ? (
        <FontAwesomeIcon icon={faCheck} size={14} color={color} />
      ) : (
        <Text style={{ color, fontSize: 14, fontWeight: '700' }}>{label}</Text>
      )}
    </View>
  );
};

type StepperHeaderProps = {
  // The "Split notes" step shows a check once splitting is finished.
  splitDone: boolean;
  // The "Send batches" step lights up once the flow reaches phase 2.
  sendActive: boolean;
};

// The two-step progress header shared by every private-migration screen:
// (1) Split notes ——— (2) Send batches.
const StepperHeader: React.FunctionComponent<StepperHeaderProps> = ({
  splitDone,
  sendActive,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const { colors } = useTheme() as ThemeType;

  const splitColor = colors.primary;
  const sendColor = sendActive ? colors.primary : colors.placeholder;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 8,
      }}
    >
      <StepCircle label="1" done={splitDone} active={true} colors={colors} />
      <Text
        style={{
          color: splitColor,
          fontSize: 16,
          fontWeight: '600',
          marginLeft: 10,
        }}
      >
        {translate('migrationstepper.split-notes') as string}
      </Text>
      <View
        style={{
          flex: 1,
          height: 1,
          backgroundColor: colors.bottomSheetBorder,
          marginHorizontal: 12,
        }}
      />
      <StepCircle
        label="2"
        done={false}
        active={sendActive}
        colors={colors}
      />
      <Text
        style={{
          color: sendColor,
          fontSize: 16,
          fontWeight: '600',
          marginLeft: 10,
        }}
      >
        {translate('migrationstepper.send-batches') as string}
      </Text>
    </View>
  );
};

export default StepperHeader;
