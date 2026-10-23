/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { Animated, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WalletNavigation } from '@app/types';
import { slopFor, useTheme, iconSizeMd, iconSize } from '@app/theme';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {
  ValueTransferType,
  ValueTransferKindEnum,
  SendPageStateClass,
  ToAddrClass,
  Route,
} from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { fiatQuote } from '@app/price/fiatQuote';
import Utils from '@app/utils';
import { FileTextIcon } from '@ui/primitives/Icons/FileTextIcon';
import { PlaneIcon } from '@ui/primitives/Icons/PlaneIcon';
import { ArrowDownIcon } from '@ui/primitives/Icons/ArrowDownIcon';
import { ArrowUpIcon } from '@ui/primitives/Icons/ArrowUpIcon';
import { ShieldIcon } from '@ui/primitives/Icons/ShieldIcon';
import { SwapIcon } from '@ui/primitives/Icons/SwapIcon';
import { shortWhen, transferRowText } from '@screens/History/historyRowText';
import HistoryAvatar from './HistoryAvatar';
import HistoryRowBody from './HistoryRowBody';

type ValueTransferLineProps = {
  index: number;
  vt: ValueTransferType;
  /** Draws the hairline above; the first row under a month has none. */
  hairline: boolean;
  setValueTransferDetailModalShow: (i: number, vt: ValueTransferType) => void;
  registerSwipeable: (r: Swipeable | null) => void;
  closeAllSwipeables: () => void;
  closeOtherSwipeables: () => void;
};

/** USD for a ZEC amount, at the transfer's own price when it carries one. */
export function usdText(amount: number, price: number): string {
  return price > 0
    ? `$${(amount * price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '';
}

/**
 * A transfer in History: its icon, what it was, when, and the ZEC with its
 * dollars. Swiping right offers the detail and, for an address, a send.
 */
const ValueTransferLine: React.FunctionComponent<ValueTransferLineProps> = ({
  index,
  vt,
  hairline,
  setValueTransferDetailModalShow,
  registerSwipeable,
  closeAllSwipeables,
  closeOtherSwipeables,
}) => {
  const navigation = useNavigation<WalletNavigation>();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    language,
    privacy,
    info,
    showSwipeableIcons,
    readOnly,
    server,
    setSendPageState,
    zecPrice,
  } = context;
  const { colors } = useTheme();
  const t = (key: string) => (translate(key) as string).trim();

  // A recycled row keeps its Swipeable open unless it is closed on rebind.
  const swipeableRef = useRef<Swipeable | null>(null);
  const setSwipeableRef = useCallback(
    (r: Swipeable | null) => {
      swipeableRef.current = r;
      registerSwipeable(r);
    },
    [registerSwipeable],
  );
  useEffect(() => {
    swipeableRef.current?.close();
  }, [vt.txid]);

  const quote = fiatQuote(zecPrice, server, server.chainName);
  const price =
    vt.zecPrice && vt.zecPrice > 0
      ? vt.zecPrice
      : quote.kind === 'quote'
        ? quote.price
        : 0;
  const text = transferRowText({
    vt,
    when: shortWhen(vt.time * 1000, Date.now(), t, ms =>
      Utils.formatDate(ms, 'MMM d', language),
    ),
    currency: info.currencyName,
    usd: usdText(vt.amount, price),
    t,
  });
  const iconColor = colors.fgDefault;
  const icon =
    vt.kind === ValueTransferKindEnum.Received ? (
      <ArrowDownIcon size={iconSizeMd} color={iconColor} />
    ) : vt.kind === ValueTransferKindEnum.Shield ? (
      <ShieldIcon size={iconSizeMd} color={iconColor} />
    ) : vt.kind === ValueTransferKindEnum.Migration ? (
      <SwapIcon size={iconSizeMd} color={iconColor} />
    ) : (
      <ArrowUpIcon size={iconSizeMd} color={iconColor} />
    );
  const haveMemo = !!vt.memos && vt.memos.length > 0 && !!vt.memos.join('');

  const handleRenderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-132, 0],
      extrapolate: 'clamp',
    });
    return (
      <>
        {showSwipeableIcons && (
          <Animated.View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              transform: [{ translateX: trans }],
              backgroundColor: colors.bgChrome,
            }}
          >
            <View
              style={{
                width: 65,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <TouchableOpacity
                hitSlop={slopFor(24)}
                style={{ zIndex: 999, padding: 20 }}
                onPress={() => {
                  setValueTransferDetailModalShow(index, vt);
                  closeAllSwipeables();
                }}
              >
                <FileTextIcon
                  style={{ opacity: 0.8 }}
                  size={iconSize}
                  color={colors.fgDefault}
                />
              </TouchableOpacity>
            </View>
            {!!vt.address && !readOnly && server.kind !== 'offline' && (
              <View
                style={{
                  width: 67,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <TouchableOpacity
                  hitSlop={slopFor(24)}
                  style={{ zIndex: 999, padding: 20 }}
                  onPress={() => {
                    const sendPageState = new SendPageStateClass(
                      new ToAddrClass(0),
                    );
                    sendPageState.toaddr.to = vt.address ? vt.address : '';
                    setSendPageState(sendPageState);
                    navigation.navigate(Route.Home, { screen: Route.Send });
                    closeAllSwipeables();
                  }}
                >
                  <PlaneIcon size={iconSize} color={colors.fgAccent} />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}
      </>
    );
  };

  return (
    <View
      testID={`vt-${index + 1}`}
      style={{ backgroundColor: colors.bgSurface }}
    >
      <TouchableOpacity
        style={{ zIndex: 999 }}
        onPress={async () => {
          closeAllSwipeables();
          await new Promise(r => requestAnimationFrame(r));
          setValueTransferDetailModalShow(index, vt);
        }}
      >
        <Swipeable
          ref={setSwipeableRef}
          onSwipeableWillOpen={closeOtherSwipeables}
          overshootLeft={false}
          overshootRight={false}
          overshootFriction={1}
          renderLeftActions={handleRenderLeftActions}
        >
          <HistoryRowBody
            leading={<HistoryAvatar icon={icon} />}
            text={text}
            privacy={privacy}
            hairline={hairline}
            memo={haveMemo}
          />
        </Swipeable>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(ValueTransferLine);
