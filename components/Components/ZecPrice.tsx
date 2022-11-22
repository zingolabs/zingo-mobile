import React from 'react';
import FadeText from './FadeText';
import Utils from '../../app/utils';

type ZecPriceProps = {
  price?: number | null;
  currencyName?: string;
};

const ZecPrice: React.FunctionComponent<ZecPriceProps> = ({ price, currencyName }) => {
  var priceString = '';

  if (!currencyName) {
    currencyName = '---';
  }

  if (price && price > 0) {
    priceString = `$ ${Utils.toLocaleFloat(price.toFixed(2))} per ${currencyName}`;
  }
  return <FadeText>{priceString}</FadeText>;
};

export default ZecPrice;
