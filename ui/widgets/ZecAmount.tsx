/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {
  Text,
  View,
  TextStyle,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useTheme, fontScaleBody } from '@app/theme';
import { getNumberFormatSettings } from 'react-native-localize';

import Utils from '@app/utils';
import { SvgXml } from 'react-native-svg';
import { CurrencyNameEnum } from '@app/AppState';
import { useTimedReveal } from '@app/hooks/useTimedReveal';

/** The Ž of the ZEC logo, in its own units: bars of 20.12 above and
    below a Z of 107.61, 88.03 wide, 14.49 from the E. */
const Z_XML = `<svg viewBox="0 0 88.03 147.85"><polygon points="34.44 107.62 34.44 106.98 87.19 34.17 87.19 20.12 56.09 20.12 56.09 0 35.98 0 35.98 20.12 5.04 20.12 5.04 40.24 53.93 40.24 53.93 40.88 0 114.64 0 127.73 35.98 127.73 35.98 147.85 56.09 147.85 56.09 127.73 88.03 127.73 88.03 107.62 34.44 107.62"/></svg>`;
const Z_WIDTH = 88.03;
const Z_FULL = 147.85;
const Z_FOOT = 127.73;
const Z_HEIGHT = 107.61;
const Z_GAP = 14.49;
/** Cap height of the system fonts (Roboto, SF) as a share of font size. */
const CAP_HEIGHT = 0.71;

type ZecAmountProps = {
  color?: string;
  size?: number;
  amtZec?: number;
  style?: TextStyle;
  currencyName?: CurrencyNameEnum;
  privacy?: boolean;
  smallPrefix?: boolean;
  testID?: string;
};

const ZecAmount: React.FunctionComponent<ZecAmountProps> = ({
  color,
  style,
  size,
  currencyName,
  amtZec,
  privacy,
  smallPrefix,
  testID,
}) => {
  const { visible, reveal } = useTimedReveal(!!privacy);
  const privacyHigh: boolean = !visible;
  const splits = Utils.splitZecAmountIntoBigSmall(amtZec);
  const { colors } = useTheme();
  const { decimalSeparator } = getNumberFormatSettings();
  /** The text grows with the OS text size up to the cap; the Ž glyph is
      an svg and has to grow with it. */
  const scale = Math.min(useWindowDimensions().fontScale, fontScaleBody);

  if (!size) {
    size = 24;
  }

  if (!color) {
    color = colors.fgDefault;
  }

  if (!smallPrefix) {
    smallPrefix = false;
  }

  const prefix = size * (smallPrefix ? 0.7 : 1);
  /** The Z between the bars is as tall as the capitals of the text, so
      the glyph's foot sits on the baseline and its lower bar hangs below
      like a descender. */
  const unit = (prefix * scale * CAP_HEIGHT) / Z_HEIGHT;

  return (
    <View style={{ ...style, flexDirection: 'row', marginHorizontal: 5 }}>
      <TouchableOpacity disabled={!privacyHigh} onPress={reveal}>
        <View
          testID={testID}
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            margin: 0,
            padding: 0,
          }}
        >
          {!!currencyName && currencyName === CurrencyNameEnum.ZEC ? (
            <>
              <View
                style={{
                  width: Z_WIDTH * unit,
                  height: Z_FOOT * unit,
                  marginRight: Z_GAP * unit,
                }}
              >
                <SvgXml
                  width={Z_WIDTH * unit}
                  height={Z_FULL * unit}
                  xml={Z_XML}
                  fill={color}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                />
              </View>
              <Text
                maxFontSizeMultiplier={fontScaleBody}
                style={{
                  fontSize: prefix,
                  fontWeight: '700',
                  color,
                  margin: 0,
                  padding: 0,
                }}
              >
                EC
              </Text>
            </>
          ) : (
            <Text
              maxFontSizeMultiplier={fontScaleBody}
              style={{
                fontSize: prefix,
                color,
                margin: 0,
                padding: 0,
              }}
            >
              {currencyName ? currencyName : '---'}
            </Text>
          )}
          {privacyHigh ? (
            <Text
              maxFontSizeMultiplier={fontScaleBody}
              style={{
                fontSize: size,
                fontWeight: '700',
                color,
                margin: 0,
                padding: 0,
              }}
            >
              {' -' + decimalSeparator + '----'}
            </Text>
          ) : (
            <Text
              testID={`${testID}.big-part`}
              maxFontSizeMultiplier={fontScaleBody}
              style={{
                fontSize: size,
                fontWeight: '700',
                color,
                margin: 0,
                padding: 0,
              }}
            >
              {' ' + splits.bigPart}
            </Text>
          )}
          {splits.smallPart !== '0000' && !privacyHigh && (
            <Text
              testID={`${testID}.small-part`}
              maxFontSizeMultiplier={fontScaleBody}
              style={{
                fontSize: size * 0.7,
                color,
                margin: 0,
                padding: 0,
              }}
            >
              {splits.smallPart}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default ZecAmount;
