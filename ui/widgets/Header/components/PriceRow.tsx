/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Image, View } from 'react-native';
import { useTheme } from '@app/theme';

import {
  ChainNameEnum,
  CurrencyEnum,
  SelectServerEnum,
  TranslateType,
} from '@app/AppState';
import InfoType from '@app/AppState/types/InfoType';
import ZecPriceType from '@app/AppState/types/ZecPriceType';
import BoldText from '@ui/primitives/BoldText';
import CurrencyAmount from '@ui/widgets/CurrencyAmount';
import FadeText from '@ui/primitives/FadeText';

const zcashLogo = require('../../../../assets/img/zcash-yellow.png');

type PriceRowProps = {
  translate: (key: string) => TranslateType;
  currency: CurrencyEnum;
  zecPrice: ZecPriceType;
  info: InfoType;
  selectServer: SelectServerEnum;
  onLayout?: (height: number) => void;
};

// Vertical margins on the card. Reported back via onLayout so the parent
// can size its bottom-sheet snap points to cover the whole price block
// (margins included), not just the card itself.
const CARD_MARGIN_TOP = 10;
const CARD_MARGIN_BOTTOM = 12;
const CARD_VERTICAL_MARGINS = CARD_MARGIN_TOP + CARD_MARGIN_BOTTOM;

const formatLastUpdate = (date: number): string => {
  if (!date) {
    return '';
  }
  return new Date(date).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const PriceRow: React.FC<PriceRowProps> = React.memo(
  ({ translate, currency, zecPrice, info, selectServer, onLayout }) => {
    const { colors } = useTheme();

    const isUsd = currency === CurrencyEnum.USDCurrency;
    if (
      !isUsd ||
      zecPrice.zecPrice <= 0 ||
      selectServer === SelectServerEnum.offline ||
      info.chainName !== ChainNameEnum.mainChainName
    ) {
      return null;
    }

    const lastUpdate = formatLastUpdate(zecPrice.date);

    return (
      <View
        onLayout={e =>
          onLayout?.(e.nativeEvent.layout.height + CARD_VERTICAL_MARGINS)
        }
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: 20,
          marginTop: CARD_MARGIN_TOP,
          marginBottom: CARD_MARGIN_BOTTOM,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 10,
          backgroundColor: colors.bgSurface,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          gap: 12,
        }}
      >
        <Image
          source={zcashLogo}
          style={{ width: 32, height: 32, resizeMode: 'contain' }}
        />
        <View style={{ flex: 1 }}>
          <BoldText style={{ color: colors.fgDefault, fontSize: 14 }}>
            Zcash
          </BoldText>
          <FadeText style={{ fontSize: 12 }}>ZEC</FadeText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <CurrencyAmount
            style={{ fontSize: 14 }}
            priceDate={zecPrice.date}
            price={zecPrice.zecPrice}
            amtZec={1}
            currency={currency}
            privacy={false}
          />
          {!!lastUpdate && (
            <FadeText style={{ fontSize: 10 }}>
              {(translate('header.lastupdate') as string) + ' ' + lastUpdate}
            </FadeText>
          )}
        </View>
      </View>
    );
  },
);

export default PriceRow;
