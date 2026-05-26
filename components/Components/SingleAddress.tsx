/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Pressable,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';

import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import {
  AddressKindEnum,
  ButtonTypeEnum,
  ModeEnum,
  RouteEnum,
  SnackbarDurationEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '../../app/AppState';
import RegText from './RegText';
import FadeText from './FadeText';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Button from './Button';
import { CopyIcon } from './Icons/CopyIcon';
import { ChevronDown, ChevronUp } from './Icons/Chevron';
import { EyeIcon } from './Icons/EyeIcon';
import { TriangleAlert } from './Icons/TriangleAlert';
import { ShieldIcon } from './Icons/ShieldIcon';
import { ListIcon } from './Icons/ListIcon';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleCheck } from '@fortawesome/free-regular-svg-icons';
import Address from './Address/Address';
import { getZingoLogo } from '../../app/utils/ZingoAppData';

type SingleAddressProps = {
  address?: UnifiedAddressClass | TransparentAddressClass;
  ufvk?: string;
  index: number;
  setIndex: (i: number) => void;
  total: number;
  show: (s: 'NA' | 'VA' | 'NAT' | 'TW' | 'EA') => void;
  changeIndex?: (index: number) => void;
  hasTransparent?: boolean;
  showMoreOptions?: boolean;
  setShowMoreOptions?: React.Dispatch<React.SetStateAction<boolean>>;
};

const SingleAddress: React.FunctionComponent<SingleAddressProps> = ({
  address,
  ufvk,
  show,
  total,
  index,
  setIndex,
  changeIndex,
  hasTransparent,
  showMoreOptions,
  setShowMoreOptions,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const { translate, privacy, addLastSnackbar, mode, addressBook } = context;
  const { colors } = useTheme() as ThemeType;

  const [expandQRAddress, setExpandQRAddress] = useState<boolean>(true);
  const contentHeight = useRef(0);

  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);

  const scrollViewRef = useRef<ScrollView>(null);

  const isBasic = ModeEnum.basic === mode;
  const isUnified = address?.addressKind === AddressKindEnum.u;

  const toggle = () => {
    setShowMoreOptions &&
      setShowMoreOptions(prev => {
        const next = !prev;

        animatedHeight.value = withTiming(next ? contentHeight.current : 0, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });

        animatedOpacity.value = withTiming(next ? 1 : 0, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });

        if (!prev) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 200);
        }

        return next;
      });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: animatedOpacity.value,
    transform: [{ translateY: showMoreOptions ? 0 : -5 }],
    overflow: 'hidden',
  }));

  useEffect(() => {
    if (privacy) {
      setExpandQRAddress(false);
    } else {
      setExpandQRAddress(true);
    }
  }, [privacy]);

  useEffect(() => {
    if (!expandQRAddress && !privacy) {
      setExpandQRAddress(true);
    }
  }, [expandQRAddress, privacy]);

  useEffect(() => {
    return () => {
      setShowMoreOptions && setShowMoreOptions(false);
      animatedStyle.height = 0;
    };
  }, [animatedStyle, setShowMoreOptions]);

  function contactFromAddress() {
    const contact = addressBook.find(c => c.address === address?.address);
    return contact ? contact.label : '';
  }

  const doCopy = () => {
    Clipboard.setString(ufvk ? ufvk : address ? address.address : '');
    addLastSnackbar(
      ufvk
        ? (translate('seed.tapcopy-ufvk-message') as string)
        : (translate('history.addresscopied') as string),
      SnackbarDurationEnum.short,
    );
  };

  const doAddressList = () => {
    navigation.navigate(RouteEnum.AddressList, {
      addressKind: address ? address.addressKind : AddressKindEnum.u,
      setIndex: setIndex,
    });
  };

  return (
    <View style={{ flexDirection: 'column', width: '100%' }}>
      <ScrollView
        ref={scrollViewRef}
        style={{ width: '100%' }}
        contentContainerStyle={{
          alignItems: 'center',
          paddingBottom: 20,
        }}
      >
        {ufvk ||
        (address &&
          address.address !== (translate('receive.noaddress') as string)) ? (
          <>
            {address && !isBasic && !isUnified && (
              <View
                style={{
                  width: '95%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  backgroundColor: colors.warning.background,
                  borderRadius: 10,
                  borderColor: colors.warning.border,
                  borderWidth: 1,
                  padding: 10,
                  marginTop: 10,
                }}
              >
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 5,
                  }}
                >
                  <TriangleAlert
                    color={colors.warning.primary}
                    size={20}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={{
                      color: colors.warning.title,
                      fontWeight: 'bold',
                      fontSize: 16,
                    }}
                  >
                    {translate('receive.transparent.warning.title') as string}
                  </Text>
                </View>
                <Text style={{ color: colors.warning.text }}>
                  {
                    translate(
                      'receive.transparent.warning.description',
                    ) as string
                  }
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    changeIndex && changeIndex(0);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    backgroundColor: colors.primary,
                    padding: 10,
                    borderRadius: 5,
                    marginTop: 10,
                  }}
                >
                  <ShieldIcon
                    color={colors.background}
                    size={20}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={{
                      color: colors.background,
                      fontWeight: 'bold',
                      fontSize: 14,
                    }}
                  >
                    {translate('receive.transparent.warning.button') as string}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 10,
                marginBottom: 5,
              }}
            >
              {!isBasic && address && isUnified && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <ShieldIcon
                      color={colors.primary}
                      size={20}
                      style={{ marginRight: 10 }}
                    />
                    <RegText
                      style={{
                        fontWeight: 'bold',
                        opacity: 0.9,
                        marginRight: 10,
                      }}
                    >
                      {
                        (address &&
                        address.has_orchard === true &&
                        address.has_sapling === false
                          ? translate('receive.shielded-orchard')
                          : address &&
                              address.has_orchard === true &&
                              address.has_sapling === true
                            ? translate('receive.shielded-orchard-sapling')
                            : address &&
                                address.has_orchard === false &&
                                address.has_sapling === true
                              ? translate('receive.shielded-sapling')
                              : '') as string
                      }
                    </RegText>
                  </View>
                </View>
              )}
              {address && !isBasic && !isUnified && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <EyeIcon
                      color={colors.warning.primaryDark}
                      size={20}
                      style={{ marginRight: 10 }}
                    />
                    <RegText
                      style={{
                        fontWeight: 'bold',
                        opacity: 0.9,
                        marginRight: 10,
                      }}
                    >
                      {address && (translate('receive.t-title') as string)}
                    </RegText>
                  </View>
                </View>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {total > 1 && (
                    <FadeText>{` (${index + 1} / ${total}) `}</FadeText>
                  )}
                </View>
              </View>
            </View>

            <View
              style={{
                marginTop: 20,
                marginHorizontal: 20,
                padding: 10,
                backgroundColor: colors.text,
              }}
            >
              {ufvk ? (
                <>
                  {expandQRAddress ? (
                    <QRCode
                      value={ufvk}
                      size={200}
                      ecl="L"
                      backgroundColor={colors.text}
                      logo={getZingoLogo()}
                      logoSize={30}
                      logoBackgroundColor={colors.text}
                      logoBorderRadius={7} /* android not soported */
                      logoMargin={3}
                    />
                  ) : (
                    <View
                      style={{
                        width: 200,
                        height: 200,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: colors.text,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setExpandQRAddress(true);
                          setTimeout(() => {
                            setExpandQRAddress(false);
                          }, 5 * 1000);
                        }}
                      >
                        <Text
                          style={{
                            color: colors.zingo,
                            textDecorationLine: 'underline',
                            marginTop: 15,
                            minHeight: 48,
                          }}
                        >
                          {translate('seed.tapreveal') as string}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <QRCode
                  value={address ? address.address : ''}
                  size={200}
                  ecl="L"
                  backgroundColor={colors.text}
                  logo={getZingoLogo()}
                  logoSize={30}
                  logoBackgroundColor={colors.text}
                  logoBorderRadius={7} /* android not soported */
                  logoMargin={3}
                />
              )}
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: 0,
                width: '100%',
                justifyContent: 'space-evenly',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 20,
                  marginBottom: 5,
                }}
              >
                <TouchableOpacity onPress={doCopy}>
                  <View
                    style={{
                      borderRadius: 30,
                      borderColor: colors.zingo,
                      paddingHorizontal: 5,
                      paddingVertical: 5,
                      marginHorizontal: 10,
                    }}
                  >
                    <CopyIcon
                      color={colors.money}
                      size={20}
                      opacity={0.9}
                      style={{ margin: 3 }}
                    />
                  </View>
                </TouchableOpacity>
                {address && !isBasic && (
                  <>
                    <TouchableOpacity onPress={() => show('VA')}>
                      <View
                        style={{
                          borderRadius: 30,
                          borderColor: colors.zingo,
                          paddingHorizontal: 5,
                          paddingVertical: 5,
                          marginHorizontal: 10,
                        }}
                      >
                        <FontAwesomeIcon
                          style={{ margin: 5, opacity: 0.9 }}
                          size={20}
                          icon={faCircleCheck}
                          color={colors.money}
                        />
                      </View>
                    </TouchableOpacity>
                    {total > 1 && (
                      <TouchableOpacity onPress={doAddressList}>
                        <View
                          style={{
                            borderRadius: 30,
                            borderColor: colors.zingo,
                            paddingHorizontal: 5,
                            paddingVertical: 5,
                            marginHorizontal: 10,
                          }}
                        >
                          <ListIcon
                            color={colors.money}
                            size={20}
                            opacity={0.9}
                            style={{ margin: 3 }}
                          />
                        </View>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
            {ufvk && (
              <Address
                address={ufvk}
                style={{ color: colors.money, fontSize: 18, opacity: 0.8 }}
                onPress={() => show('EA')}
              />
            )}
            {address && (
              <View
                style={{
                  flexDirection: 'column',
                  width: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                {contactFromAddress() ? (
                  <Text
                    style={{
                      color: colors.zingo,
                      fontSize: 16,
                    }}
                  >
                    {contactFromAddress()}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={() => show('NAT')}>
                    <Text
                      style={{
                        color: colors.zingo,
                        textDecorationLine: 'underline',
                        fontSize: 16,
                      }}
                    >
                      {translate('receive.add-tag') as string}
                    </Text>
                  </TouchableOpacity>
                )}
                <Address
                  address={address.address}
                  style={{ color: colors.money, fontSize: 18, opacity: 0.8 }}
                  onPress={() => show('EA')}
                  testID={
                    address.addressKind === AddressKindEnum.u
                      ? 'receive.unified-address'
                      : undefined
                  }
                />
              </View>
            )}
            <View
              style={{
                flexDirection: 'column',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 10,
              }}
            >
              {!isBasic && address && (
                <>
                  {isUnified ? (
                    <Button
                      onPress={() => show('NA')}
                      title={translate('receive.newu-option') as string}
                      type={ButtonTypeEnum.Primary}
                    />
                  ) : (
                    <Button
                      onPress={() => show('NA')}
                      title={
                        translate('receive.transparent.newt-option') as string
                      }
                      type={ButtonTypeEnum.Tertiary}
                    />
                  )}

                  {isUnified && hasTransparent && (
                    <>
                      <Pressable
                        onPress={toggle}
                        style={{
                          width: '70%',
                          marginVertical: 26,
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingHorizontal: 10,
                        }}
                      >
                        <TriangleAlert
                          size={20}
                          color={
                            showMoreOptions
                              ? colors.warning.primary
                              : colors.zingo
                          }
                          style={{ marginRight: 16 }}
                        />
                        <Text
                          style={{
                            fontSize: 16,
                            color: showMoreOptions
                              ? colors.warning.primary
                              : colors.zingo,
                          }}
                        >
                          {translate('receive.danger-zone') as string}{' '}
                        </Text>
                        {showMoreOptions ? (
                          <ChevronUp
                            size={16}
                            color={colors.warning.primary}
                            style={{ marginLeft: 16 }}
                          />
                        ) : (
                          <ChevronDown
                            size={16}
                            color={colors.zingo}
                            style={{ marginLeft: 16 }}
                          />
                        )}
                      </Pressable>

                      <Animated.View style={[animatedStyle]}>
                        <View
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <TouchableOpacity
                            onLayout={e => {
                              contentHeight.current =
                                e.nativeEvent.layout.height;
                            }}
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 10,
                              backgroundColor: colors.secondary,
                              borderColor: colors.secondaryBorder,
                              borderWidth: 1,
                              padding: 0,
                              paddingLeft: 20,
                              paddingRight: 20,
                              borderRadius: 10,
                              maxWidth: '90%',
                              minWidth: '30%',
                              minHeight: 48,
                              width: '80%',
                            }}
                            onPress={() => {
                              show('TW');
                              setShowMoreOptions && setShowMoreOptions(false);
                              animatedHeight.value = 0;
                            }}
                          >
                            <Text style={{ color: colors.text }}>
                              {translate('receive.go-to-transparent') as string}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </Animated.View>
                    </>
                  )}
                </>
              )}
            </View>
          </>
        ) : (
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 50,
              marginBottom: 30,
            }}
          >
            <RegText>{ufvk ? ufvk : address ? address.address : ''}</RegText>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SingleAddress;
