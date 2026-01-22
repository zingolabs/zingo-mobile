/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect } from 'react';
import { Animated, View, TouchableOpacity } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowDown,
  faArrowUp,
  faRefresh,
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
import moment from 'moment';

import { ContextAppLoaded } from '../../../app/context';
import { RPCValueTransfersStatusEnum } from '../../../app/rpc/enums/RPCValueTransfersStatusEnum';
import Utils from '../../../app/utils';
import RegText from '../../Components/RegText';
import Stake from '../../../assets/icons/stake-blue.svg';
import Unstake from '../../../assets/icons/unstake-yellow.svg';

type ValueTransferLineProps = {
  index: number;
  month: string;
  vt: ValueTransferType;
  setValueTransferDetailModalShow: (i: number, vt: ValueTransferType) => void;
  nextLineWithSameTxid: boolean;
  //setMessagesAddressModalShow: (vt: ValueTransferType) => void;
  addressProtected?: boolean;
  screenName: ScreenEnum;
  registerSwipeable: (r: Swipeable) => void;
  closeAllSwipeables: () => void;
  closeOtherSwipeables: () => void;
};
const ValueTransferLine: React.FunctionComponent<ValueTransferLineProps> = ({
  index,
  vt,
  month,
  setValueTransferDetailModalShow,
  //setMessagesAddressModalShow,
  addressProtected,
  registerSwipeable,
  closeAllSwipeables,
  closeOtherSwipeables,
}) => {
  const navigation: any = useNavigation();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    language,
    privacy,
    info,
    showSwipeableIcons,
    readOnly,
    selectIndexerServer,
    setSendPageState,
  } = context;
  const { colors } = useTheme() as ThemeType;

  //const [messagesAddress, setMessagesAddress] = useState<boolean>(false);

  //const dimensions = {
  //  width: Dimensions.get('window').width,
  //  height: Dimensions.get('window').height,
  //};
  //const maxWidthHit = useRef<boolean>(false);

  const amountColor = Utils.valueTransferKindColor(colors.text, vt);

  const icon =
      vt.kind === ValueTransferKindEnum.Received || vt.kind === ValueTransferKindEnum.Shield
        ? faArrowDown
        : faArrowUp;

  useEffect(() => {
    Utils.setMomentLocale(language);
  }, [language]);

  //useEffect(() => {
  //  setMessagesAddress(Utils.isMessagesAddress(vt));
  //}, [vt]);

  /*
  const handleRenderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    swipeable: Swipeable,
  ) => {
    const width = dimensions.width * 0.7;
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [width, 0],
      extrapolate: 'extend',
    });

    dragX.addListener(({ value }) => {
      if (-value >= dimensions.width * (1 / 2) && messagesAddress) {
        if (!maxWidthHit.current) {
          //console.log(value);
          setValueTransferDetail(vt);
          setValueTransferDetailIndex(index);
          setMessagesAddressModalShow(true);
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
              justifyContent: 'flex-start',
              alignItems: 'center',
              transform: [{ translateX: trans }],
              backgroundColor: colors.sideMenuBackground,
            }}>
            {messagesAddress && (
              <View
                style={{
                  width: width,
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                }}>
                <TouchableOpacity
                  style={{ zIndex: 999, padding: 20, alignSelf: 'flex-start' }}
                  onPress={() => {
                    setValueTransferDetail(vt);
                    setValueTransferDetailIndex(index);
                    setMessagesAddressModalShow(true);
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
  */

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
                  size={30}
                  icon={faFileLines}
                  color={colors.money}
                />
              </TouchableOpacity>
            </View>
            {!!vt.address &&
              !readOnly &&
              selectIndexerServer !== SelectServerEnum.offline &&
              !addressProtected && (
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
                      navigation.navigate(RouteEnum.Send);
                      closeAllSwipeables();
                    }}
                  >
                    <FontAwesomeIcon
                      size={30}
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
  //  vt.status = RPCValueTransfersStatusEnum.calculated;
  //  vt.address = "aydelaymanianero";
  //}
  //if (index === 1 ) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.transmitted;
  //  vt.address = "pepeillo";
  //}
  //if (index === 2) {
  //  vt.confirmations = 0;
  //  vt.status = RPCValueTransfersStatusEnum.mempool;
  //}
  //if (index === 3 ) {
  //  vt.confirmations = 1;
  //  vt.status = RPCValueTransfersStatusEnum.confirmed;
  //}

  return (
    <View
      testID={`vt-${index + 1}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginHorizontal: 10,
      }}
    >
      {month !== '' && (
        <View
          style={{
            marginTop: 20,
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            paddingVertical: 10,
            paddingHorizontal: 25,
            backgroundColor: '#78788029',
          }}
        >
          <RegText>Activity</RegText>
          <FadeText>{month}</FadeText>
        </View>
      )}
      <TouchableOpacity
        style={{
          zIndex: 999,
          backgroundColor: colors.secondary,
          paddingHorizontal: 5,
        }}
        onPress={async () => {
          closeAllSwipeables();
          await new Promise(r => requestAnimationFrame(r));
          setValueTransferDetailModalShow(index, vt);
        }}
      >
        <Swipeable
          ref={registerSwipeable}
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
              alignItems: 'flex-start',
              marginTop: 10,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#333333',
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
              <View style={{ display: 'flex', marginHorizontal: 5 }}>
                {vt.confirmations >= 0 && vt.confirmations < GlobalConst.minConfirmations ? (
                  <FontAwesomeIcon
                    style={{ marginLeft: 5, marginRight: 5, marginTop: 0, transform: [{ rotate: '45deg' }] }}
                    size={20}
                    icon={faRefresh}
                    color={amountColor}
                  />
                ) : (
                  <>
                    {vt.stakingAction && vt.stakingAction.kind === 'create_bond' && (
                      <Stake width={20} height={20} />
                    )}
                    {vt.stakingAction && 
                      (vt.stakingAction.kind === 'begin_unbonding' || 
                        vt.stakingAction.kind === 'withdraw_bond' ||
                        vt.stakingAction.kind === 'redelegate') && (
                      <Unstake width={20} height={20} />
                    )}
                    {vt.stakingAction === null && (
                      <FontAwesomeIcon
                        style={{ marginLeft: 5, marginRight: 5, marginTop: 0, transform: [{ rotate: '45deg' }] }}
                        size={20}
                        icon={icon}
                        color={amountColor}
                      />
                    )}
                  </>
                )}
              </View>
              <View style={{ display: 'flex' }}>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <FadeText
                    style={{
                      opacity: 1,
                      fontWeight: 'bold',
                      color: '#d3d3d3ff',
                      fontSize: 18,
                    }}
                  >
                    {Utils.valueTransferKindText(translate, vt)}
                  </FadeText>

                  {!!vt.address && (
                    <View>
                      <RegText>{`to: ${Utils.trimToSmall(vt.address, 8)}`}</RegText>
                    </View>
                  )}

                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <FadeText>
                      {vt.time
                        ? moment((vt.time || 0) * 1000).format('MMM D, h:mm a')
                        : '--'}
                    </FadeText>
                    {vt.confirmations === 0 && (
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FadeText
                          style={{
                            color:
                              vt.status ===
                                RPCValueTransfersStatusEnum.transmitted ||
                              vt.status ===
                                RPCValueTransfersStatusEnum.calculated ||
                              vt.status === RPCValueTransfersStatusEnum.mempool
                                ? colors.primary
                                : colors.primaryDisabled,
                            fontSize: 12,
                            opacity: 1,
                            fontWeight: '700',
                            textAlign: 'left',
                            marginLeft: 10,
                          }}
                        >
                          {translate(`history.${vt.status}`) as string}
                        </FadeText>
                      </View>
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
                }}
                size={18}
                currencyName={info.currencyName}
                color={amountColor}
                amtZec={
                  vt.kind === ValueTransferKindEnum.Received ||
                  vt.kind === ValueTransferKindEnum.Shield
                    ? vt.amount
                    : Number(
                          Utils.splitZecAmountIntoBigSmall(vt.amount).bigPart,
                        ) === 0
                      ? vt.amount
                      : vt.amount * -1
                }
                privacy={privacy}
              />
            </View>
          </View>
        </Swipeable>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(ValueTransferLine);
