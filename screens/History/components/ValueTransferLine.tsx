/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { Animated, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WalletNavigation } from '@app/types';
import {
  iconSize,
  iconSizeSm,
  slopFor,
  space12,
  space16,
  space4,
  space8,
  useTheme,
} from '@app/theme';
import ListRow from '@ui/primitives/ListRow';
import Text from '@ui/primitives/Text';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import ZecAmount from '@ui/widgets/ZecAmount';
import FadeText from '@ui/primitives/FadeText';
import {
  ValueTransferType,
  ValueTransferKindEnum,
  GlobalConst,
  SendPageStateClass,
  ToAddrClass,
  Route,
} from '@app/AppState';

import { ContextAppLoaded } from '@app/context';
import AddressItem from '@ui/widgets/AddressItem';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import Utils from '@app/utils';
import { FileTextIcon } from '@ui/primitives/Icons/FileTextIcon';
import { PlaneIcon } from '@ui/primitives/Icons/PlaneIcon';
import { MessagesIcon } from '@ui/primitives/Icons/MessagesIcon';
import { TriangleAlert } from '@ui/primitives/Icons/TriangleAlert';
import { ArrowDownIcon } from '@ui/primitives/Icons/ArrowDownIcon';
import { ArrowUpIcon } from '@ui/primitives/Icons/ArrowUpIcon';
import { RefreshIcon } from '@ui/primitives/Icons/RefreshIcon';
import { SwapIcon } from '@ui/primitives/Icons/SwapIcon';
//import Utils from '@app/utils';

type ValueTransferLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetailModalShow: (i: number, vt: ValueTransferType) => void;
  nextLineWithSameTxid: boolean;
  //setMessagesAddressModalShow: (vt: ValueTransferType) => void;
  registerSwipeable: (r: Swipeable | null) => void;
  closeAllSwipeables: () => void;
  closeOtherSwipeables: () => void;
};
/** Each kind's label while it is on its way, and once it has landed. */
const KIND_LABEL: Record<ValueTransferKindEnum, [string, string]> = {
  [ValueTransferKindEnum.Sent]: ['history.sending', 'history.sent'],
  [ValueTransferKindEnum.Received]: ['history.receiving', 'history.received'],
  [ValueTransferKindEnum.MemoToSelf]: [
    'history.sendingmemotoself',
    'history.memotoself',
  ],
  [ValueTransferKindEnum.SendToSelf]: [
    'history.sendingtoself',
    'history.sendtoself',
  ],
  [ValueTransferKindEnum.Shield]: ['history.shielding', 'history.shield'],
  [ValueTransferKindEnum.Rejection]: ['history.sending', 'history.rejection'],
  [ValueTransferKindEnum.Migration]: ['history.migrating', 'history.migration'],
  [ValueTransferKindEnum.Swap]: ['history.swapping', 'history.swap'],
};

const FAILED_LABEL: Partial<Record<ValueTransferKindEnum, string>> = {
  [ValueTransferKindEnum.Sent]: 'history.sent-failed',
  [ValueTransferKindEnum.Swap]: 'history.swap-failed',
  [ValueTransferKindEnum.Shield]: 'history.shield-failed',
  [ValueTransferKindEnum.Received]: 'history.received-failed',
};

const labelKey = (
  kind: ValueTransferKindEnum,
  confirmations: number,
  failed: boolean,
): string =>
  (failed ? FAILED_LABEL[kind] : undefined) ??
  KIND_LABEL[kind][confirmations === 0 ? 0 : 1];

/** The status line lines up with the row's text: padding, icon and gap. */
const STATUS_INDENT = space16 + iconSize + space12;

const ValueTransferLine: React.FunctionComponent<ValueTransferLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetailModalShow,
  nextLineWithSameTxid,
  //setMessagesAddressModalShow,
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
  } = context;
  const { colors } = useTheme();

  // When RecyclerListView reuses this row for a different transfer, the
  // Swipeable's internal open/closed state stays pinned to the recycled view
  // unless we explicitly close it on rebind. We keep a local ref alongside
  // the parent's registry callback so the parent can still iterate and close
  // all rows.
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

  const amountColor =
    vt.status === RPCValueTransfersStatusEnum.failed
      ? colors.fgMuted
      : vt.confirmations >= 0 && vt.confirmations < GlobalConst.minConfirmations
        ? colors.fgAccentDisabled
        : vt.kind === ValueTransferKindEnum.Received ||
            vt.kind === ValueTransferKindEnum.Shield
          ? colors.fgAccent
          : colors.fgDefault;

  const KindIcon =
    vt.confirmations >= 0 &&
    vt.confirmations < GlobalConst.minConfirmations &&
    vt.status !== RPCValueTransfersStatusEnum.failed
      ? RefreshIcon
      : vt.kind === ValueTransferKindEnum.Migration
        ? SwapIcon
        : vt.kind === ValueTransferKindEnum.Received ||
            vt.kind === ValueTransferKindEnum.Shield
          ? ArrowDownIcon
          : ArrowUpIcon;

  const haveMemo = vt.memos && vt.memos.length > 0 && !!vt.memos.join('');
  const failed = vt.status === RPCValueTransfersStatusEnum.failed;
  const inFlight =
    vt.status === RPCValueTransfersStatusEnum.transmitted ||
    vt.status === RPCValueTransfersStatusEnum.calculated;
  /** Still under the confirmations the app waits for. */
  const pending =
    vt.confirmations >= 0 && vt.confirmations < GlobalConst.minConfirmations;
  const titleColor = failed
    ? colors.fgMuted
    : vt.kind === ValueTransferKindEnum.Received ||
        vt.kind === ValueTransferKindEnum.Shield
      ? colors.fgAccent
      : colors.fgDefault;
  const kindLabel = translate(
    labelKey(vt.kind, vt.confirmations, failed),
  ) as string;

  const handleRenderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
    _swipeable: Swipeable,
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
                  size={24}
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
                    // enviar
                    const sendPageState = new SendPageStateClass(
                      new ToAddrClass(0),
                    );
                    sendPageState.toaddr.to = vt.address ? vt.address : '';
                    setSendPageState(sendPageState);
                    navigation.navigate(Route.Home, {
                      screen: Route.Send,
                    });
                    closeAllSwipeables();
                  }}
                >
                  <PlaneIcon size={24} color={colors.fgAccent} />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}
      </>
    );
  };

  //console.log('render ValueTransferLine - 5', month, vt);

  //if (index === 0) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.failed;
  //  vt.kind = ValueTransferKindEnum.Shield;
  //}
  //if (index === 1) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.failed;
  //  vt.kind = ValueTransferKindEnum.Sent;
  //}
  //if (index === 0) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.mempool;
  //}
  //if (index === 1) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.mempool;
  //}
  //if (index === 2 ) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.mempool;
  //}
  //if (index === 3 ) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.mempool;
  //}

  return (
    <View
      testID={`vt-${index + 1}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {month !== '' && (
        <View
          style={{
            paddingLeft: 15,
            paddingTop: 10,
            paddingBottom: 0,
            backgroundColor: colors.bgSurface,
          }}
        >
          <FadeText>{month}</FadeText>
        </View>
      )}
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
          <View style={{ paddingBottom: vt.confirmations === 0 ? space8 : 0 }}>
            <ListRow
              leading={
                <KindIcon
                  size={iconSize}
                  color={inFlight ? colors.fgSyncing : amountColor}
                />
              }
              title={
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    columnGap: space8,
                  }}
                >
                  <Text variant="bodyStrong" color={titleColor}>
                    {kindLabel}
                  </Text>
                  {/* One line in every row: the address takes what is
                      left and is clipped, so no row grows a second line. */}
                  {!!vt.address && !pending && (
                    <View style={{ flexShrink: 1, overflow: 'hidden' }}>
                      <AddressItem address={vt.address} oneLine={true} />
                    </View>
                  )}
                </View>
              }
              subtitle={
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text variant="bodySmall" tone="muted">
                      {vt.time
                        ? Utils.formatDate(
                            (vt.time || 0) * 1000,
                            'MMM d, h:mm aaa',
                            language,
                          )
                        : '--'}
                    </Text>
                    {haveMemo && (
                      <MessagesIcon
                        style={{ marginLeft: space8 }}
                        size={iconSizeSm}
                        color={
                          failed ? colors.fgMuted : colors.fgAccentDisabled
                        }
                      />
                    )}
                  </View>
                </View>
              }
              trailing={
                <ZecAmount
                  style={{ opacity: failed ? 0.7 : 1 }}
                  size={15}
                  currencyName={info.currencyName}
                  color={failed ? colors.fgMuted : amountColor}
                  amtZec={vt.amount}
                  privacy={privacy}
                />
              }
            />
            {vt.confirmations === 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: inFlight ? 'center' : 'flex-start',
                  paddingLeft: inFlight ? 0 : STATUS_INDENT,
                }}
              >
                {inFlight && (
                  <TriangleAlert
                    style={{ marginRight: space4 }}
                    color={colors.fgSyncing}
                    size={iconSizeSm}
                  />
                )}
                <Text
                  variant="caption"
                  color={
                    failed
                      ? colors.fgDanger
                      : inFlight
                        ? colors.fgAccent
                        : colors.fgAccentDisabled
                  }
                  style={{
                    fontWeight: '700',
                    textDecorationLine: inFlight ? 'underline' : 'none',
                  }}
                >
                  {translate(`history.${vt.status}`) as string}
                </Text>
              </View>
            )}
            {/* Lines of the same TXID render flush against each other; the
                separator only marks the boundary between transactions, and
                stops at the row's gutter like its content. */}
            {!nextLineWithSameTxid && (
              <View
                style={{
                  height: 1,
                  marginHorizontal: space16,
                  backgroundColor: colors.borderSubtle,
                }}
              />
            )}
          </View>
        </Swipeable>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(ValueTransferLine);
