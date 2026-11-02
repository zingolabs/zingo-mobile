/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WalletNavigation } from '@app/types';
import { slopFor, useTheme, iconSizeMd, iconSize } from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {
  ValueTransferType,
  SendPageStateClass,
  ToAddrClass,
  Route,
  GlobalConst,
} from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { fiatQuote } from '@app/price/fiatQuote';
import Utils from '@app/utils';
import { formatUsd } from '@app/utils/formatAmount';
import { FileTextIcon } from '@ui/primitives/Icons/FileTextIcon';
import { PlaneIcon } from '@ui/primitives/Icons/PlaneIcon';
import { shortWhen, transferRowText } from '@screens/History/historyRowText';
import { transferIcon } from '@screens/History/transferIcon';
import HistoryAvatar from './HistoryAvatar';
import Avatar, { avatarCategoryOf } from '@ui/widgets/Avatar';
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
  return price > 0 ? formatUsd(amount * price) : '';
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
    info,
    showSwipeableIcons,
    readOnly,
    server,
    setSendPageState,
    zecPrice,
    addressBook,
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
  /** The Zcash contact the row's address belongs to. */
  const contact = vt.address
    ? addressBook.find(
        entry =>
          entry.address === vt.address &&
          entry.swapChain === GlobalConst.zecSwapChain,
      )
    : undefined;
  const text = transferRowText({
    vt,
    when: shortWhen(vt.time * 1000, Date.now(), t, ms =>
      Utils.formatDate(ms, 'MMM d', language),
    ),
    currency: info.currencyName,
    usd: usdText(vt.amount, price),
    t,
    contactName: contact?.label,
  });
  const { icon: KindIcon, danger } = transferIcon(vt);
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
              backgroundColor: colors.bgSurface,
            }}
          >
            <View
              style={{
                width: 65,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Pressable
                kind="icon"
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
              </Pressable>
            </View>
            {!!vt.address && !readOnly && server.kind !== 'offline' && (
              <View
                style={{
                  width: 67,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Pressable
                  kind="icon"
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
                </Pressable>
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
      <Pressable
        kind="row"
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
            leading={
              contact ? (
                <Avatar
                  kind="contact"
                  name={contact.label}
                  category={avatarCategoryOf(contact.color)}
                  chain={GlobalConst.zecSwapChain}
                  size="md"
                />
              ) : danger ? (
                <Avatar kind="icon" icon={KindIcon} danger size="md" />
              ) : (
                <HistoryAvatar
                  icon={<KindIcon size={iconSizeMd} color={colors.fgDefault} />}
                />
              )
            }
            text={text}
            hairline={hairline}
            memo={haveMemo}
          />
        </Swipeable>
      </Pressable>
    </View>
  );
};

export default React.memo(ValueTransferLine);
