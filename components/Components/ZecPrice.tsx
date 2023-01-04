import React from 'react';
import FadeText from './FadeText';
import Utils from '../../app/utils';

type ZecPriceProps = {
  price: number;
  currencyName: string;
  currency: 'USD' | '';
};

const ZecPrice: React.FunctionComponent<ZecPriceProps> = ({ price, currencyName, currency }) => {
  var priceString = '';
  var currencyNameString = '';

  if (!currencyName) {
    currencyNameString = '---';
  } else {
    currencyNameString = currencyName;
  }

  if (currency === 'USD') {
    if (price > 0) {
      priceString = `$ ${Utils.toLocaleFloat(price.toFixed(2))} ${currency} per ${currencyNameString}`;
    }
  } else {
    if (price > 0) {
      priceString = `${Utils.toLocaleFloat(price.toFixed(2))} ${currency} per ${currencyNameString}`;
    }
  }

  return <FadeText>{priceString}</FadeText>;
};

export default ZecPrice;
