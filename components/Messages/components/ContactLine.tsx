/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCircleCheck as faCircleCheckSolid,
  faComments,
  faPaperPlane,
  faCircleUser,
} from '@fortawesome/free-solid-svg-icons';
import { faCircleCheck as faCircleCheckRegular } from '@fortawesome/free-regular-svg-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import FadeText from '../../Components/FadeText';
import {
  ValueTransferKindEnum,
  SendPageStateClass,
  ToAddrClass,
  RouteEnum,
  SelectServerEnum,
  ContactType,
  GlobalConst,
  ScreenEnum,
} from '../../../app/AppState';
import { ThemeType } from '../../../app/types';

import { ContextAppLoaded } from '../../../app/context';
import AddressItem from '../../Components/AddressItem';
import Utils from '../../../app/utils';
import { RPCValueTransfersStatusEnum } from '../../../app/rpc/enums/RPCValueTransfersStatusEnum';
import RegText from '../../Components/RegText';

type ContactLineProps = {
  index: number;
  month: string;
  c: ContactType;
  setMessagesAddressModalShow: (c: ContactType) => void;
  addressProtected?: boolean;
  screenName: ScreenEnum;
};
const ContactLine: React.FunctionComponent<ContactLineProps> = ({
  index,
  c,
  month,
  setMessagesAddressModalShow,
  addressProtected,
  screenName,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    language,
    showSwipeableIcons,
    readOnly,
    selectServer,
    setSendPageState,
  } = context;
  const { colors } = useTheme() as ThemeType;

  const [messagesAddress, setMessagesAddress] = useState<boolean>(false);

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };
  const maxWidthHit = useRef<boolean>(false);
  const swipeableRef = useRef<Swipeable | null>(null);

  const getAmountColor = (_c: ContactType) => {
    return _c.confirmations >= 0 &&
      _c.confirmations < GlobalConst.minConfirmations
      ? colors.primaryDisabled
      : _c.kind === ValueTransferKindEnum.Received ||
          _c.kind === ValueTransferKindEnum.Shield
        ? colors.primary
        : colors.text;
  };

  const getIcon = () => {
    return faCircleUser;
  };

  const getLabel = (_c: ContactType) => {
    let initials = null;
    if (_c.label) {
      const words = _c.label
        .trim()
        .split(' ')
        .filter((w: string) => !!w);
      if (words[0]) {
        initials = words[0].charAt(0).toUpperCase();
      }
      if (words[1]) {
        initials = initials + words[1].charAt(0).toUpperCase();
      }
    }
    return initials;
  };

  const getMemo = (_c: ContactType) => {
    // ignoring memoUA if exists
    const { memo } = Utils.splitMemo(_c.memos);
    return memo;
  };

  useEffect(() => {
    setMessagesAddress(Utils.isMessagesAddress(c));
  }, [c]);

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
          setMessagesAddressModalShow(c);
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
            }}
          >
            {messagesAddress && (
              <View
                style={{
                  width: width,
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                }}
              >
                <TouchableOpacity
                  style={{ zIndex: 999, padding: 20, alignSelf: 'flex-start' }}
                  onPress={() => {
                    setMessagesAddressModalShow(c);
                    swipeable.reset();
                  }}
                >
                  <FontAwesomeIcon
                    style={{ opacity: 0.8 }}
                    size={24}
                    icon={faComments}
                    color={colors.money}
                  />
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
      outputRange: [-67, 0],
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
            {!!c.address &&
              !readOnly &&
              selectServer !== SelectServerEnum.offline &&
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
                      sendPageState.toaddr.to = c.address ? c.address : '';
                      setSendPageState(sendPageState);
                      navigation.navigate(RouteEnum.HomeStack, {
                        screen: RouteEnum.Send,
                      });
                      swipeable.reset();
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

  //console.log('render contact line - 5', c);

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
    <View
      testID={`vt-${index + 1}`}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
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
          }}
        >
          <FadeText>{month}</FadeText>
        </View>
      )}
      <TouchableOpacity
        style={{ zIndex: 999 }}
        onPress={() => {
          setMessagesAddressModalShow(c);
          swipeableRef?.current?.reset();
        }}
      >
        <Swipeable
          ref={swipeableRef}
          overshootLeft={false}
          overshootRight={messagesAddress ? true : false}
          rightThreshold={65}
          overshootFriction={1}
          renderRightActions={handleRenderRightActions}
          renderLeftActions={handleRenderLeftActions}
        >
          <View
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginTop: 15,
              paddingBottom: 10,
              borderBottomWidth: 1.5,
              borderBottomColor: colors.border,
              width: '100%',
            }}
          >
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                width: '100%',
              }}
            >
              <View style={{ minWidth: 50, width: '10%' }}>
                {!getLabel(c) ? (
                  <FontAwesomeIcon
                    style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
                    size={32}
                    icon={getIcon()}
                    color={getAmountColor(c)}
                  />
                ) : (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      backgroundColor: c.color,
                      borderColor: colors.zingo,
                      borderWidth: 2,
                      borderRadius: 22,
                      marginLeft: 5,
                      marginRight: 5,
                      marginTop: 0,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: 'bold',
                        fontSize: 20,
                        color: Utils.getLabelColor(c.color),
                      }}
                    >{`${getLabel(c)}`}</Text>
                  </View>
                )}
              </View>
              <View style={{ display: 'flex', width: '85%', maxWidth: '85%' }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  {c.label ? (
                    <RegText>{c.label}</RegText>
                  ) : (
                    <AddressItem
                      address={c.address}
                      screenName={screenName}
                      oneLine={true}
                    />
                  )}
                  <FadeText>
                    {c.time
                      ? Utils.formatDate(
                          (c.time || 0) * 1000,
                          'MMM d, h:mm aaa',
                          language,
                        )
                      : ''}
                  </FadeText>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <FadeText
                    numberOfLines={2}
                    ellipsizeMode={'tail'}
                    style={{ width: '85%', maxWidth: '85%' }}
                  >
                    {(c.kind === ValueTransferKindEnum.MemoToSelf ||
                    c.kind === ValueTransferKindEnum.Sent
                      ? 'You: '
                      : '') + getMemo(c)}
                  </FadeText>
                  <View
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {!!c.status && (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {(c.status === RPCValueTransfersStatusEnum.calculated ||
                          c.status ===
                            RPCValueTransfersStatusEnum.transmitted) && (
                          <FontAwesomeIcon
                            style={{
                              marginLeft: 5,
                              marginRight: 1,
                              marginTop: 2,
                            }}
                            size={12}
                            icon={faCircleCheckRegular}
                            color={colors.primary}
                          />
                        )}
                        {(c.status === RPCValueTransfersStatusEnum.mempool ||
                          c.status ===
                            RPCValueTransfersStatusEnum.confirmed) && (
                          <FontAwesomeIcon
                            style={{
                              marginLeft: 5,
                              marginRight: 1,
                              marginTop: 2,
                            }}
                            size={12}
                            icon={faCircleCheckSolid}
                            color={colors.primary}
                          />
                        )}
                        {c.status !== RPCValueTransfersStatusEnum.confirmed && (
                          <FontAwesomeIcon
                            style={{
                              marginLeft: 1,
                              marginRight: 0,
                              marginTop: 2,
                            }}
                            size={12}
                            icon={faCircleCheckRegular}
                            color={colors.primary}
                          />
                        )}
                        {c.status === RPCValueTransfersStatusEnum.confirmed && (
                          <FontAwesomeIcon
                            style={{
                              marginLeft: 1,
                              marginRight: 0,
                              marginTop: 2,
                            }}
                            size={12}
                            icon={faCircleCheckSolid}
                            color={colors.primary}
                          />
                        )}
                        {c.status !== RPCValueTransfersStatusEnum.confirmed && (
                          <View style={{ marginLeft: 2, marginTop: 2 }}>
                            <ActivityIndicator
                              size={
                                Platform.OS === GlobalConst.platformOSios
                                  ? 'small'
                                  : 12
                              }
                              color={colors.primary}
                            />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Swipeable>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(ContactLine);
