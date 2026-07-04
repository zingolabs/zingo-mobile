/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { Animated, View, TouchableOpacity } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowDown,
  faArrowUp,
  faRefresh,
  faRightLeft,
  faComment,
  faTriangleExclamation,
  //faComments,
  faFileLines,
  faPaperPlane,
} from '@fortawesome/free-solid-svg-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import {
  ValueTransferType,
  ValueTransferKindEnum,
  GlobalConst,
  SendPageStateClass,
  ToAddrClass,
  RouteEnum,
  SelectServerEnum,
  ScreenEnum,
} from '../../../app/AppState';
import { ThemeType } from '../../../app/types';

import { ContextAppLoaded } from '../../../app/context';
import AddressItem from '../../Components/AddressItem';
import { RPCValueTransfersStatusEnum } from '../../../app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { swapStatusLabel } from '../../../app/swap/swapStatusLabel';
import Utils from '../../../app/utils';
//import Utils from '../../../app/utils';

type ValueTransferLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetailModalShow: (i: number, vt: ValueTransferType) => void;
  nextLineWithSameTxid: boolean;
  //setMessagesAddressModalShow: (vt: ValueTransferType) => void;
  addressProtected?: boolean;
  screenName: ScreenEnum;
  registerSwipeable: (r: Swipeable | null) => void;
  closeAllSwipeables: () => void;
  closeOtherSwipeables: () => void;
};
const ValueTransferLine: React.FunctionComponent<ValueTransferLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetailModalShow,
  nextLineWithSameTxid,
  //setMessagesAddressModalShow,
  addressProtected,
  screenName,
  registerSwipeable,
  closeAllSwipeables,
  closeOtherSwipeables,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    language,
    privacy,
    info,
    showSwipeableIcons,
    readOnly,
    selectServer,
    setSendPageState,
  } = context;
  const { colors } = useTheme() as ThemeType;

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
      ? // Swap-kind failed rows use the same coral red the rest of the app
        // surfaces for failed transactions in the sub-line; the legacy
        // `colors.zingo` (muted gray) is kept for non-swap failed rows so
        // existing Sent/Received-failed visuals stay unchanged.
        vt.kind === ValueTransferKindEnum.Swap
        ? 'coral'
        : colors.zingo
      : // Swap rows do not carry per-leg confirmations the way zingolib VTs
        // do — `confirmations` is a binary flag (0 or 1). Decide colour
        // purely on swap direction so an inbound swap reads like a
        // Received row (primary / green) and an outbound swap reads like
        // a Sent row (text / default), matching the user's mental model
        // of money entering vs leaving the wallet.
        vt.kind === ValueTransferKindEnum.Swap
        ? vt.swapIsInbound
          ? colors.primary
          : colors.text
        : vt.confirmations >= 0 &&
            vt.confirmations < GlobalConst.minConfirmations
          ? colors.primaryDisabled
          : vt.kind === ValueTransferKindEnum.Received ||
              vt.kind === ValueTransferKindEnum.Shield
            ? colors.primary
            : colors.text;

  // Swap rows get the bidirectional `faRightLeft` icon so they read as
  // distinct from plain Sent/Received in the list. A non-terminal swap (still
  // pending / processing per `RPCValueTransfersStatusEnum.mempool` or
  // `calculated`) gets the spinning `faRefresh` instead so the user sees
  // activity at a glance.
  const icon =
    vt.kind === ValueTransferKindEnum.Swap
      ? vt.status !== RPCValueTransfersStatusEnum.failed &&
        vt.status !== RPCValueTransfersStatusEnum.confirmed
        ? faRefresh
        : faRightLeft
      : vt.confirmations >= 0 &&
          vt.confirmations < GlobalConst.minConfirmations &&
          vt.status !== RPCValueTransfersStatusEnum.failed
        ? faRefresh
        : vt.kind === ValueTransferKindEnum.Received ||
            vt.kind === ValueTransferKindEnum.Shield
          ? faArrowDown
          : faArrowUp;

  const haveMemo = vt.memos && vt.memos.length > 0 && !!vt.memos.join('');

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
              backgroundColor: colors.sideMenuBackground,
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
                style={{ zIndex: 999, padding: 20 }}
                onPress={() => {
                  setValueTransferDetailModalShow(index, vt);
                  closeAllSwipeables();
                }}
              >
                <FontAwesomeIcon
                  style={{ opacity: 0.8 }}
                  size={24}
                  icon={faFileLines}
                  color={colors.money}
                />
              </TouchableOpacity>
            </View>
            {!!vt.address &&
              !readOnly &&
              selectServer !== SelectServerEnum.offline &&
              !addressProtected &&
              // Send affordance doesn't apply to swap rows: the address on
              // the line is either an ephemeral t-addr (outbound) or a
              // provider-issued deposit address (inbound) — neither is a
              // reusable recipient for a one-off send.
              vt.kind !== ValueTransferKindEnum.Swap && (
                <View
                  style={{
                    width: 67,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <TouchableOpacity
                    style={{ zIndex: 999, padding: 20 }}
                    onPress={() => {
                      // enviar
                      const sendPageState = new SendPageStateClass(
                        new ToAddrClass(0),
                      );
                      sendPageState.toaddr.to = vt.address ? vt.address : '';
                      setSendPageState(sendPageState);
                      navigation.navigate(RouteEnum.HomeStack, {
                        screen: RouteEnum.Send,
                      });
                      closeAllSwipeables();
                    }}
                  >
                    <FontAwesomeIcon
                      size={24}
                      icon={faPaperPlane}
                      color={colors.primary}
                    />
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
            backgroundColor: colors.bottomSheetBackground,
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
          <View
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems:
                vt.status === RPCValueTransfersStatusEnum.transmitted ||
                vt.status === RPCValueTransfersStatusEnum.calculated
                  ? 'center'
                  : 'flex-start',
              marginTop: 10,
              paddingBottom: 10,
              // Lines that belong to the same TXID render flush against
              // each other — no separator. The separator only marks the
              // boundary between distinct transactions.
              borderBottomWidth: nextLineWithSameTxid ? 0 : 1.5,
              borderBottomColor: '#122033',
              borderStyle: 'solid',
            }}
          >
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <View style={{ display: 'flex' }}>
                <FontAwesomeIcon
                  style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                  size={24}
                  icon={icon}
                  color={
                    vt.status === RPCValueTransfersStatusEnum.transmitted ||
                    vt.status === RPCValueTransfersStatusEnum.calculated
                      ? colors.syncing
                      : amountColor
                  }
                />
              </View>
              <View style={{ display: 'flex' }}>
                {!!vt.address &&
                  (vt.confirmations < 0 ||
                    vt.confirmations >= GlobalConst.minConfirmations) && (
                    <View>
                      <AddressItem
                        address={vt.address}
                        screenName={screenName}
                        oneLine={true}
                      />
                    </View>
                  )}
                <View
                  style={{
                    display: 'flex',
                    flexDirection:
                      vt.kind === ValueTransferKindEnum.Sent &&
                      (vt.confirmations < 0 ||
                        vt.confirmations >= GlobalConst.minConfirmations)
                        ? 'row'
                        : 'column',
                    alignItems:
                      vt.kind === ValueTransferKindEnum.Sent &&
                      (vt.confirmations < 0 ||
                        vt.confirmations >= GlobalConst.minConfirmations)
                        ? 'center'
                        : 'flex-start',
                  }}
                >
                  <FadeText
                    style={{
                      opacity:
                        vt.status === RPCValueTransfersStatusEnum.failed
                          ? undefined
                          : 1,
                      fontWeight: 'bold',
                      color:
                        vt.status === RPCValueTransfersStatusEnum.failed
                          ? // Swap-failed labels use the same coral red the
                            // sub-line uses for failed transactions; non-swap
                            // failed labels keep `colors.zingo` for backward
                            // visual compatibility with Sent/Received-failed.
                            vt.kind === ValueTransferKindEnum.Swap
                            ? 'coral'
                            : colors.zingo
                          : // Inbound swaps mirror a Received row's
                            // colouring (primary / green); outbound swaps
                            // mirror a Sent row's (text / default). Same
                            // mental model as the amount colour above.
                            vt.kind === ValueTransferKindEnum.Swap
                            ? vt.swapIsInbound
                              ? colors.primary
                              : colors.text
                            : vt.kind === ValueTransferKindEnum.Received ||
                                vt.kind === ValueTransferKindEnum.Shield
                              ? colors.primary
                              : colors.text,
                      fontSize:
                        // Swap rows are a synthesised projection of a
                        // SwapRecord and do not carry per-leg confirmation
                        // counts — `confirmations` is a flag, not a count —
                        // so the "below min-confirmations → small" branch
                        // is the wrong one to take. Render at the same
                        // size as a settled VT.
                        vt.kind === ValueTransferKindEnum.Swap
                          ? 18
                          : vt.confirmations >= 0 &&
                              vt.confirmations < GlobalConst.minConfirmations
                            ? 14
                            : 18,
                    }}
                  >
                    {vt.kind === ValueTransferKindEnum.Swap
                      ? vt.status === RPCValueTransfersStatusEnum.failed
                        ? (translate('history.swap-failed') as string)
                        : vt.status === RPCValueTransfersStatusEnum.confirmed
                          ? (translate('history.swap') as string)
                          : (translate('history.swapping') as string)
                      : vt.status === RPCValueTransfersStatusEnum.failed &&
                          vt.kind === ValueTransferKindEnum.Sent
                        ? (translate('history.sent-failed') as string)
                        : vt.status === RPCValueTransfersStatusEnum.failed &&
                            vt.kind === ValueTransferKindEnum.Shield
                          ? (translate('history.shield-failed') as string)
                          : vt.status === RPCValueTransfersStatusEnum.failed &&
                              vt.kind === ValueTransferKindEnum.Received
                            ? (translate('history.received-failed') as string)
                            : vt.kind === ValueTransferKindEnum.Sent &&
                                vt.confirmations === 0
                              ? (translate('history.sending') as string)
                              : vt.kind === ValueTransferKindEnum.Sent &&
                                  vt.confirmations !== 0
                                ? (translate('history.sent') as string)
                                : vt.kind === ValueTransferKindEnum.Received &&
                                    vt.confirmations === 0
                                  ? (translate('history.receiving') as string)
                                  : vt.kind ===
                                        ValueTransferKindEnum.Received &&
                                      vt.confirmations !== 0
                                    ? (translate('history.received') as string)
                                    : vt.kind ===
                                          ValueTransferKindEnum.MemoToSelf &&
                                        vt.confirmations === 0
                                      ? (translate(
                                          'history.sendingtoself',
                                        ) as string)
                                      : vt.kind ===
                                            ValueTransferKindEnum.MemoToSelf &&
                                          vt.confirmations !== 0
                                        ? (translate(
                                            'history.memotoself',
                                          ) as string)
                                        : vt.kind ===
                                              ValueTransferKindEnum.SendToSelf &&
                                            vt.confirmations === 0
                                          ? (translate(
                                              'history.sendingtoself',
                                            ) as string)
                                          : vt.kind ===
                                                ValueTransferKindEnum.SendToSelf &&
                                              vt.confirmations !== 0
                                            ? (translate(
                                                'history.sendtoself',
                                              ) as string)
                                            : vt.kind ===
                                                  ValueTransferKindEnum.Shield &&
                                                vt.confirmations === 0
                                              ? (translate(
                                                  'history.shielding',
                                                ) as string)
                                              : vt.kind ===
                                                    ValueTransferKindEnum.Shield &&
                                                  vt.confirmations !== 0
                                                ? (translate(
                                                    'history.shield',
                                                  ) as string)
                                                : vt.kind ===
                                                      ValueTransferKindEnum.Rejection &&
                                                    vt.confirmations === 0
                                                  ? (translate(
                                                      'history.sending',
                                                    ) as string)
                                                  : vt.kind ===
                                                        ValueTransferKindEnum.Rejection &&
                                                      vt.confirmations !== 0
                                                    ? (translate(
                                                        'history.rejection',
                                                      ) as string)
                                                    : ''}
                  </FadeText>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <FadeText>
                      {vt.time
                        ? Utils.formatDate(
                            (vt.time || 0) * 1000,
                            'MMM d, h:mm aaa',
                            language,
                          )
                        : '--'}
                    </FadeText>
                    {haveMemo && (
                      <FontAwesomeIcon
                        style={{ marginLeft: 10 }}
                        size={12}
                        icon={faComment}
                        color={
                          vt.status === RPCValueTransfersStatusEnum.failed
                            ? colors.zingo
                            : colors.primaryDisabled
                        }
                      />
                    )}
                  </View>
                </View>
              </View>
              <ZecAmount
                style={{
                  flexGrow: 1,
                  alignSelf: 'auto',
                  justifyContent: 'flex-end',
                  paddingRight: 5,
                  opacity:
                    vt.status === RPCValueTransfersStatusEnum.failed ? 0.7 : 1,
                }}
                size={14}
                currencyName={info.currencyName}
                color={
                  vt.status === RPCValueTransfersStatusEnum.failed
                    ? colors.zingo
                    : amountColor
                }
                amtZec={vt.amount}
                privacy={privacy}
              />
            </View>
            {vt.confirmations === 0 && (
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 3,
                }}
              >
                {(vt.status === RPCValueTransfersStatusEnum.transmitted ||
                  vt.status === RPCValueTransfersStatusEnum.calculated) && (
                  <FontAwesomeIcon
                    style={{ marginRight: 5 }}
                    icon={faTriangleExclamation}
                    color={colors.syncing}
                    size={12}
                  />
                )}
                <FadeText
                  style={{
                    color:
                      vt.status === RPCValueTransfersStatusEnum.failed
                        ? 'coral'
                        : vt.status ===
                              RPCValueTransfersStatusEnum.transmitted ||
                            vt.status === RPCValueTransfersStatusEnum.calculated
                          ? colors.primary
                          : colors.primaryDisabled,
                    fontSize: 12,
                    opacity: 1,
                    fontWeight: '700',
                    textAlign:
                      vt.status === RPCValueTransfersStatusEnum.transmitted ||
                      vt.status === RPCValueTransfersStatusEnum.calculated
                        ? 'center'
                        : 'left',
                    textDecorationLine:
                      vt.status === RPCValueTransfersStatusEnum.transmitted ||
                      vt.status === RPCValueTransfersStatusEnum.calculated
                        ? 'underline'
                        : 'none',
                    marginLeft:
                      vt.status === RPCValueTransfersStatusEnum.transmitted ||
                      vt.status === RPCValueTransfersStatusEnum.calculated
                        ? 0
                        : 40,
                  }}
                >
                  {/* Swap rows surface the granular SwapStatusEnum label
                      (matches the SwapDetail status block verbatim);
                      everything else falls back to the VT-status-based
                      label which is what the rest of the History list
                      has always rendered. The visual decisions above
                      (colour / icon / alignment) stay driven by the VT
                      status because they only need three buckets
                      (failed / in-mempool-ish / pre-evidence). */}
                  {vt.kind === ValueTransferKindEnum.Swap &&
                  vt.swapStatus !== undefined
                    ? swapStatusLabel(vt.swapStatus, translate)
                    : (translate(`history.${vt.status}`) as string)}
                </FadeText>
              </View>
            )}
          </View>
        </Swipeable>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(ValueTransferLine);
