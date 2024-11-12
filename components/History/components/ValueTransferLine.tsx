/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, View, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowDown,
  faArrowUp,
  faRefresh,
  faComment,
  faTriangleExclamation,
  faComments,
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
  RouteEnums,
} from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { ContextAppLoaded } from '../../../app/context';
import AddressItem from '../../Components/AddressItem';
import { RPCValueTransfersStatusEnum } from '../../../app/rpc/enums/RPCValueTransfersStatusEnum';
import Utils from '../../../app/utils';

type ValueTransferLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetail: (t: ValueTransferType) => void;
  setValueTransferDetailIndex: (i: number) => void;
  setValueTransferDetailModalShowing: (b: boolean) => void;
  nextLineWithSameTxid: boolean;
  setSendPageState: (s: SendPageStateClass) => void;
  setMessagesAddressModalShowing: (b: boolean) => void;
};
const ValueTransferLine: React.FunctionComponent<ValueTransferLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetail,
  setValueTransferDetailIndex,
  setValueTransferDetailModalShowing,
  nextLineWithSameTxid,
  setSendPageState,
  setMessagesAddressModalShowing,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, privacy, info, navigation, showSwipeableIcons } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [messagesAddress, setMessagesAddress] = useState<boolean>(false);

  const dimensions = {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  };
  const maxWidthHit = useRef<boolean>(false);
  const swipeableRef = useRef<Swipeable | null>(null);

  const getAmountColor = (_vt: ValueTransferType) => {
    return _vt.confirmations === 0
      ? colors.primaryDisabled
      : _vt.kind === ValueTransferKindEnum.Received || _vt.kind === ValueTransferKindEnum.Shield
      ? colors.primary
      : colors.text;
  };

  const getIcon = (_vt: ValueTransferType) => {
    return _vt.confirmations === 0
      ? faRefresh
      : _vt.kind === ValueTransferKindEnum.Received || _vt.kind === ValueTransferKindEnum.Shield
      ? faArrowDown
      : faArrowUp;
  };

  const getHaveMemo = (_vt: ValueTransferType) => {
    // if have any memo
    const memos: string[] = _vt.memos ? _vt.memos.filter(m => !!m) : [];
    return memos.length > 0;
  };

  useEffect(() => {
    setMessagesAddress(Utils.isMessagesAddress(vt));
  }, [vt]);

  const handleRenderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    swipeable: Swipeable,
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
      extrapolate: 'extend',
    });

    dragX.addListener(({ value }) => {
      if (-value >= dimensions.width * (1 / 2) && messagesAddress) {
        if (!maxWidthHit.current) {
          //console.log(value);
          setValueTransferDetail(vt);
          setValueTransferDetailIndex(index);
          setMessagesAddressModalShowing(true);
          swipeable.reset();
        }
        maxWidthHit.current = true;
      } else {
        maxWidthHit.current = false;
      }
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
            }}>
            {messagesAddress && (
              <View
                style={{
                  width: 50,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 20,
                }}>
                <TouchableOpacity
                  style={{ zIndex: 999, padding: 10 }}
                  onPress={() => {
                    setValueTransferDetail(vt);
                    setValueTransferDetailIndex(index);
                    setMessagesAddressModalShowing(true);
                    swipeable.reset();
                  }}>
                  <FontAwesomeIcon style={{ opacity: 0.8 }} size={30} icon={faComments} color={colors.money} />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}
      </>
    );
  };

  const handleRenderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    _dragX: Animated.AnimatedInterpolation<number>,
    swipeable: Swipeable,
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 0],
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
              marginRight: 20,
            }}>
            <View style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity
                style={{ zIndex: 999, padding: 10 }}
                onPress={() => {
                  setValueTransferDetail(vt);
                  setValueTransferDetailIndex(index);
                  setValueTransferDetailModalShowing(true);
                  swipeable.reset();
                }}>
                <FontAwesomeIcon style={{ opacity: 0.8 }} size={25} icon={faFileLines} color={colors.money} />
              </TouchableOpacity>
            </View>
            {!!vt.address && (
              <View
                style={{
                  width: 50,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <TouchableOpacity
                  style={{ zIndex: 999, padding: 10 }}
                  onPress={() => {
                    // enviar
                    const sendPageState = new SendPageStateClass(new ToAddrClass(0));
                    sendPageState.toaddr.to = vt.address ? vt.address : '';
                    setSendPageState(sendPageState);
                    navigation.navigate(RouteEnums.LoadedApp, {
                      screen: translate('loadedapp.send-menu'),
                      initial: false,
                    });
                    swipeable.reset();
                  }}>
                  <FontAwesomeIcon size={27} icon={faPaperPlane} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}
      </>
    );
  };

  //console.log('render ValueTransferLine - 5', index, messagesAddress);

  //if (index === 0) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.calculated;
  //}
  //if (index === 0) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.transmitted;
  //}
  //if (index === 1) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.mempool;
  //}

  return (
    <View testID={`vt-${index + 1}`} style={{ display: 'flex', flexDirection: 'column' }}>
      {month !== '' && (
        <View
          style={{
            paddingLeft: 15,
            paddingTop: 5,
            paddingBottom: 5,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.card,
            backgroundColor: colors.background,
          }}>
          <FadeText>{month}</FadeText>
        </View>
      )}
      <TouchableOpacity
        style={{ zIndex: 999 }}
        onPress={() => {
          setValueTransferDetail(vt);
          setValueTransferDetailIndex(index);
          setValueTransferDetailModalShowing(true);
          swipeableRef?.current?.reset();
        }}>
        <Swipeable
          ref={swipeableRef}
          overshootLeft={false}
          overshootRight={messagesAddress ? true : false}
          overshootFriction={1}
          renderRightActions={handleRenderRightActions}
          renderLeftActions={handleRenderLeftActions}>
          <View
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems:
                vt.status === RPCValueTransfersStatusEnum.transmitted ||
                vt.status === RPCValueTransfersStatusEnum.calculated
                  ? 'center'
                  : 'flex-start',
              marginTop: 15,
              paddingBottom: 10,
              borderBottomWidth: nextLineWithSameTxid ? (Platform.OS === GlobalConst.platformOSandroid ? 1 : 0.5) : 1.5,
              borderBottomColor: nextLineWithSameTxid ? colors.primaryDisabled : colors.border,
              borderStyle: nextLineWithSameTxid
                ? Platform.OS === GlobalConst.platformOSandroid
                  ? 'dotted'
                  : 'solid'
                : 'solid',
            }}>
            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ display: 'flex' }}>
                <FontAwesomeIcon
                  style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                  size={30}
                  icon={getIcon(vt)}
                  color={
                    vt.status === RPCValueTransfersStatusEnum.transmitted ||
                    vt.status === RPCValueTransfersStatusEnum.calculated
                      ? colors.syncing
                      : getAmountColor(vt)
                  }
                />
              </View>
              <View style={{ display: 'flex' }}>
                {!!vt.address && vt.confirmations > 0 && (
                  <View>
                    <AddressItem address={vt.address} oneLine={true} closeModal={() => {}} openModal={() => {}} />
                  </View>
                )}
                <View
                  style={{
                    display: 'flex',
                    flexDirection: vt.kind === ValueTransferKindEnum.Sent && vt.confirmations > 0 ? 'row' : 'column',
                    alignItems:
                      vt.kind === ValueTransferKindEnum.Sent && vt.confirmations > 0 ? 'center' : 'flex-start',
                  }}>
                  <FadeText
                    style={{
                      opacity: 1,
                      fontWeight: 'bold',
                      color: getAmountColor(vt),
                      fontSize: vt.confirmations === 0 ? 14 : 18,
                    }}>
                    {vt.kind === ValueTransferKindEnum.Sent && vt.confirmations === 0
                      ? (translate('history.sending') as string)
                      : vt.kind === ValueTransferKindEnum.Sent && vt.confirmations > 0
                      ? (translate('history.sent') as string)
                      : vt.kind === ValueTransferKindEnum.Received && vt.confirmations === 0
                      ? (translate('history.receiving') as string)
                      : vt.kind === ValueTransferKindEnum.Received && vt.confirmations > 0
                      ? (translate('history.received') as string)
                      : vt.kind === ValueTransferKindEnum.MemoToSelf && vt.confirmations === 0
                      ? (translate('history.sendingtoself') as string)
                      : vt.kind === ValueTransferKindEnum.MemoToSelf && vt.confirmations > 0
                      ? (translate('history.memotoself') as string)
                      : vt.kind === ValueTransferKindEnum.SendToSelf && vt.confirmations === 0
                      ? (translate('history.sendingtoself') as string)
                      : vt.kind === ValueTransferKindEnum.SendToSelf && vt.confirmations > 0
                      ? (translate('history.sendtoself') as string)
                      : vt.kind === ValueTransferKindEnum.Shield && vt.confirmations === 0
                      ? (translate('history.shielding') as string)
                      : vt.kind === ValueTransferKindEnum.Shield && vt.confirmations > 0
                      ? (translate('history.shield') as string)
                      : vt.kind === ValueTransferKindEnum.Rejection && vt.confirmations === 0
                      ? (translate('history.sending') as string)
                      : vt.kind === ValueTransferKindEnum.Rejection && vt.confirmations > 0
                      ? (translate('history.rejection') as string)
                      : ''}
                  </FadeText>
                  <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <FadeText>{vt.time ? moment((vt.time || 0) * 1000).format('MMM D, h:mm a') : '--'}</FadeText>
                    {getHaveMemo(vt) && (
                      <FontAwesomeIcon
                        style={{ marginLeft: 10 }}
                        size={15}
                        icon={faComment}
                        color={colors.primaryDisabled}
                      />
                    )}
                  </View>
                </View>
              </View>
              <ZecAmount
                style={{ flexGrow: 1, alignSelf: 'auto', justifyContent: 'flex-end', paddingRight: 5 }}
                size={18}
                currencyName={info.currencyName}
                color={getAmountColor(vt)}
                amtZec={vt.amount}
                privacy={privacy}
              />
            </View>
            {vt.confirmations === 0 && (
              <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {(vt.status === RPCValueTransfersStatusEnum.transmitted ||
                  vt.status === RPCValueTransfersStatusEnum.calculated) && (
                  <FontAwesomeIcon
                    style={{ marginRight: 5 }}
                    icon={faTriangleExclamation}
                    color={colors.syncing}
                    size={15}
                  />
                )}
                <FadeText
                  style={{
                    color:
                      vt.status === RPCValueTransfersStatusEnum.transmitted ||
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
                  }}>
                  {translate(`history.${vt.status}`) as string}
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
