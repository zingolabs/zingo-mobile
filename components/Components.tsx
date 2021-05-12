/* eslint-disable react-native/no-inline-styles */
import React, {useState, useEffect} from 'react';
import {TouchableOpacity, Text, TextInput, View, Platform} from 'react-native';
import {useTheme} from '@react-navigation/native';
import Utils from '../app/utils';

type UsdAmountProps = {
  price?: number | null;
  amtZec?: number;
  style?: any;
};
export const UsdAmount: React.FunctionComponent<UsdAmountProps> = ({price, style, amtZec}) => {
  const {colors} = useTheme();
  var usdString;

  if (!price || typeof amtZec === 'undefined') {
    usdString = '--';
  } else {
    const usdAmount = price * amtZec;
    usdString = usdAmount.toFixed(2);
    if (usdString === '0.00' && amtZec > 0) {
      usdString = '< 0.01';
    }
  }

  return <Text style={{color: colors.text, ...style}}>$ {Utils.toLocaleFloat(usdString)}</Text>;
};

type ZecAmountProps = {
  color?: string;
  size?: number;
  amtZec?: number;
  style?: any;
  zecSymbol?: string;
};
export const ZecAmount: React.FunctionComponent<ZecAmountProps> = ({color, style, size, zecSymbol, amtZec}) => {
  const splits = Utils.splitZecAmountIntoBigSmall(amtZec);
  const {colors} = useTheme();

  if (!size) {
    size = 24;
  }

  if (!zecSymbol) {
    zecSymbol = 'ZEC';
  }

  if (!color) {
    color = colors.text;
  }

  const alignmentPadding = Platform.OS === 'android' ? 4 : 0;

  return (
    <View style={{...style, flexDirection: 'row', alignItems: 'baseline'}}>
      <Text style={{fontSize: size, color}}>
        {zecSymbol} {Utils.toLocaleFloat(splits.bigPart)}
      </Text>
      <Text style={{fontSize: size / 2, color, paddingBottom: alignmentPadding}}>{splits.smallPart}</Text>
    </View>
  );
};

export const PrimaryButton: React.FunctionComponent<any> = ({title, disabled, onPress}) => {
  const {colors} = useTheme();

  return (
    <TouchableOpacity
      style={{
        backgroundColor: disabled ? 'grey' : colors.primary,
        padding: 10,
        paddingLeft: 20,
        paddingRight: 20,
        borderRadius: 10,
        width: 250,
      }}
      onPress={() => !disabled && onPress()}>
      <Text style={{color: colors.background, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center'}}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export const SecondaryButton: React.FunctionComponent<any> = ({title, disabled, onPress, style}) => {
  const {colors} = useTheme();

  return (
    <TouchableOpacity
      style={{
        ...style,
        borderColor: colors.text,
        borderWidth: 1,
        padding: 10,
        paddingLeft: 20,
        paddingRight: 20,
        borderRadius: 10,
        width: 250,
      }}
      onPress={() => !disabled && onPress()}>
      <Text style={{color: colors.text, fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center'}}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export const BoldText: React.FunctionComponent<any> = ({style, children}) => {
  const {colors} = useTheme();
  let arrayed = [];

  if (Array.isArray(style)) {
    arrayed = style.slice(0);
  } else if (style) {
    arrayed.push(style);
  }

  arrayed.push({color: colors.text}, {fontSize: 18}, {fontWeight: 'bold'}, {opacity: 0.87});

  return <Text style={arrayed}>{children}</Text>;
};

export const FadeText: React.FunctionComponent<any> = props => {
  const {colors} = useTheme();

  return <Text style={{opacity: 0.65, color: colors.text, ...props.style}}>{props.children}</Text>;
};

export const ErrorText: React.FunctionComponent<any> = props => {
  return <Text style={{color: 'red', ...props.style}}>{props.children}</Text>;
};

export const RegText: React.FunctionComponent<any> = ({style, color, onPress, children}) => {
  const {colors} = useTheme();

  let arrayed = [];

  if (Array.isArray(style)) {
    arrayed = style.slice(0);
  } else if (style) {
    arrayed.push(style);
  }
  arrayed.push({color: color || colors.text, fontSize: 18, fontWeight: '600', opacity: 0.87});

  return (
    <Text style={arrayed} onPress={onPress}>
      {children}
    </Text>
  );
};

export const RegTextInput: React.FunctionComponent<any> = props => {
  const {colors} = useTheme();

  // There's a real idiot bug in react native that prevents paste unless editable is set.
  // https://github.com/facebook/react-native/issues/20887#issuecomment-586405383
  const [editable, setEditable] = useState(false);

  useEffect(() => {
    setEditable(true);
  }, []);
  let arrayed = [];

  if (Array.isArray(props.style)) {
    arrayed = props.style.slice(0);
  } else if (props.style) {
    arrayed.push(props.style);
  }
  arrayed.push({color: colors.text}, {fontWeight: '600'});

  return <TextInput {...props} style={arrayed} editable={editable} />;
};
