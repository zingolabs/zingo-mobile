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

  return (
    <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
      <Text style={{color: colors.money, fontSize: 20, ...style}}>$</Text>
      <Text style={{color: colors.money, fontSize: 20, fontWeight: '700', ...style}}>{' ' + Utils.toLocaleFloat(usdString)}</Text>
      <Text style={{color: colors.money, fontSize: 20, ...style}}>{' USD'}</Text>
    </View>
  );
};

type ZecPriceProps = {
  price?: number | null;
  currencyName?: string;
};
export const ZecPrice: React.FunctionComponent<ZecPriceProps> = ({price, currencyName}) => {
  var priceString = '';

  if (!currencyName) {
    currencyName = '---';
  }

  if (price && price > 0) {
    priceString = `$ ${Utils.toLocaleFloat(price.toFixed(2))} per ${currencyName}`;
  }
  return <FadeText>{priceString}</FadeText>;
};

type ZecAmountProps = {
  color?: string;
  size?: number;
  amtZec?: number;
  style?: any;
  currencyName?: string;
};
export const ZecAmount: React.FunctionComponent<ZecAmountProps> = ({color, style, size, currencyName, amtZec}) => {
  const splits = Utils.splitZecAmountIntoBigSmall(amtZec);
  const {colors} = useTheme();

  if (!size) {
    size = 24;
  }

  if (!currencyName) {
    currencyName = '---';
  }

  if (!color) {
    color = colors.money;
  }

  const alignmentPadding = Platform.OS === 'android' ? 4 : 0;

  return (
    <View style={{...style, flexDirection: 'row', alignItems: 'baseline'}}>
      <Text style={{fontSize: size, color}}>
        {'\u1647'}
      </Text>
      <Text style={{fontSize: size, fontWeight: '700', color}}>
        {' ' + Utils.toLocaleFloat(splits.bigPart)}
      </Text>
      <Text style={{fontSize: size / 2, color, paddingBottom: alignmentPadding}}>{splits.smallPart}</Text>
      <Text style={{fontSize: size, color}}>
        {' ' + currencyName}
      </Text>
    </View>
  );
};

export const BoldText: React.FunctionComponent<any> = ({style, children}) => {
  const {colors} = useTheme();
  const totalStyle = {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 0.87,
    ...style
  };

  return <Text style={totalStyle}>{children}</Text>;
};

export const FadeText: React.FunctionComponent<any> = props => {
  const {colors} = useTheme();

  return <Text style={{opacity: 0.65, color: colors.text, ...props.style}}>{props.children}</Text>;
};

export const ClickableText: React.FunctionComponent<any> = props => {
  const {colors} = useTheme();
  const onPress = props.onPress || null;

  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={{color: colors.text, textDecorationLine: 'underline', ...props.style}}>{props.children}</Text>
    </TouchableOpacity>
  );
};

export const ErrorText: React.FunctionComponent<any> = props => {
  const {colors} = useTheme();

  return <Text style={{color: colors.primary, ...props.style}}>{props.children}</Text>;
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
  arrayed.push({color: props.style.color || colors.text}, {fontWeight: '600'});

  return <TextInput {...props} style={arrayed} editable={editable} />;
};
