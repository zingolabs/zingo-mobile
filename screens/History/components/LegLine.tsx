import React, { useContext } from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { useUnfold } from '@app/hooks/useUnfold';
import { useNavigation } from '@react-navigation/native';
import { WalletNavigation } from '@app/types';
import { useTheme } from '@app/theme';
import { Route } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { fiatQuote } from '@app/price/fiatQuote';
import Utils from '@app/utils';
import { legRowText } from '@screens/History/historyRowText';
import HistoryRowBody from './HistoryRowBody';
import { usdText } from './ValueTransferLine';

/**
 * One of a swap's Zcash transactions, folded under its row: sent or
 * received, the time and the fee, the ZEC with its dollars. It opens the
 * transaction.
 */
function LegLine({
  vt,
  recordId,
}: {
  vt: ValueTransferType;
  recordId: string;
}) {
  const navigation = useNavigation<WalletNavigation>();
  const { translate, language, privacy, info, zecPrice, server } =
    useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const t = (key: string) => (translate(key) as string).trim();
  const unfold = useUnfold();
  const quote = fiatQuote(zecPrice, server, server.chainName);
  const price =
    vt.zecPrice && vt.zecPrice > 0
      ? vt.zecPrice
      : quote.kind === 'quote'
        ? quote.price
        : 0;
  const text = legRowText({
    vt,
    time: Utils.formatDate(vt.time * 1000, 'h:mm aaa', language),
    currency: info.currencyName,
    usd: usdText(vt.amount, price),
    t,
  });
  return (
    <Animated.View style={unfold}>
      <Pressable
        testID={`leg-${vt.txid}`}
        accessibilityRole="button"
        onPress={() =>
          navigation.navigate(Route.SwapTransaction, {
            recordId,
            txid: vt.txid,
            kind: vt.kind,
          })
        }
        style={({ pressed }) => ({
          backgroundColor: pressed ? colors.bgMutedSubtle : colors.bgSurface,
        })}
      >
        <HistoryRowBody
          text={text}
          privacy={privacy}
          hairline={false}
          compact
        />
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(LegLine);
