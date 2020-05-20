/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {Button, Text, TextInput, View} from 'react-native';
import {useTheme} from '@react-navigation/native';
import Utils from '../app/utils';

type ZecAmountProps = {
  color?: string;
  size?: number;
  amtZec: number;
};
export const ZecAmount: React.FunctionComponent<ZecAmountProps> = ({color, size, amtZec}) => {
  const splits = Utils.splitZecAmountIntoBigSmall(amtZec);
  const {colors} = useTheme();

  if (!size) {
    size = 18;
  }
  if (!color) {
    color = colors.text;
  }

  return (
    <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
      <Text style={{fontSize: size, color}}>{splits.bigPart}</Text>
      <Text style={{fontSize: size - 6, color}}>{splits.smallPart}</Text>
    </View>
  );
};

export const PrimaryButton: React.FunctionComponent<any> = (props) => {
  const {colors} = useTheme();
  return <Button {...props} color={colors.primary} />;
};

export const BoldText: React.FunctionComponent<any> = ({style, children}) => {
  const {colors} = useTheme();
  let arrayed = [];

  if (Array.isArray(style)) {
    arrayed = style;
  } else if (style) {
    arrayed.push(style);
  }

  arrayed.push({color: colors.text}, {fontSize: 18}, {fontWeight: 'bold'}, {opacity: 0.87});

  return <Text style={arrayed}>{children}</Text>;
};

export const RegText: React.FunctionComponent<any> = ({style, children}) => {
  const {colors} = useTheme();
  let arrayed = [];

  if (Array.isArray(style)) {
    arrayed = style;
  } else if (style) {
    arrayed.push(style);
  }

  arrayed.push({color: colors.text}, {fontSize: 18}, {fontWeight: '600'}, {opacity: 0.87});

  return <Text style={arrayed}>{children}</Text>;
};

export const RegTextInput: React.FunctionComponent<any> = (props) => {
  const {colors} = useTheme();
  let arrayed = [];

  if (Array.isArray(props.style)) {
    arrayed = props.style;
  } else if (props.style) {
    arrayed.push(props.style);
  }
  arrayed.push({color: colors.text}, {fontWeight: '600'});

  return <TextInput {...props} style={arrayed} />;
};
