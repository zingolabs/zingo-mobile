/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@react-navigation/native';

import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import {
  AddressKindEnum,
  ModeEnum,
  ScreenEnum,
  SnackbarDurationEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '../../app/AppState';
import RegText from './RegText';
import Clipboard from '@react-native-clipboard/clipboard';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { CopyIcon } from './Icons/CopyIcon';
import { TriangleAlert } from './Icons/TriangleAlert';
import { ShieldIcon } from './Icons/ShieldIcon';
import Address from './Address/Address';

type SingleAddressProps = {
  address?: UnifiedAddressClass | TransparentAddressClass;
  screenName: ScreenEnum;
  index: number;
  setIndex: (i: number) => void;
  total: number;
  show: (s: 'NA' | 'VA' | 'TW' | 'EA') => void;
  changeIndex?: (index: number) => void;
  hasTransparent?: boolean;
  showMoreOptions?: boolean;
  setShowMoreOptions?: React.Dispatch<React.SetStateAction<boolean>>;
};

const SingleAddress: React.FunctionComponent<SingleAddressProps> = ({
  address,
  screenName,
  show,
  changeIndex,
  showMoreOptions,
  setShowMoreOptions,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, privacy, addLastSnackbar, mode } = context;
  const { colors } = useTheme() as ThemeType;

  const [expandQRAddress, setExpandQRAddress] = useState<boolean>(true);

  const animatedHeight = useSharedValue(0);
  const animatedOpacity = useSharedValue(0);

  const scrollViewRef = useRef<ScrollView>(null);

  const isBasic = ModeEnum.basic === mode;
  const isUnified = address?.addressKind === AddressKindEnum.u;

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

  const doCopy = () => {
    Clipboard.setString(address ? address.address : '');
    addLastSnackbar({
      message: (translate('history.addresscopied') as string),
      duration: SnackbarDurationEnum.short,
      screenName: [screenName],
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
        }}>
        {address && address.address !== (translate('receive.noaddress') as string) ? (
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
                }}>
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                  <TriangleAlert color={colors.warning.primary} size={24} style={{ marginRight: 10 }} />
                  <Text style={{ color: colors.warning.title, fontWeight: 'bold', fontSize: 16 }}>
                    {translate('receive.transparent.warning.title') as string}
                  </Text>
                </View>
                <Text style={{ color: colors.warning.text }}>
                  {translate('receive.transparent.warning.description') as string}
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
                  }}>
                  <ShieldIcon color={colors.background} size={24} style={{ marginRight: 5 }} />
                  <Text style={{ color: colors.background, fontWeight: 'bold', fontSize: 14 }}>
                    {translate('receive.transparent.warning.button') as string}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ marginTop: 20, marginHorizontal: 20, padding: 10, backgroundColor: colors.text, borderRadius: 15 }}>
              <QRCode
                value={address ? address.address : ''}
                size={200}
                ecl="L"
                backgroundColor={colors.text}
                logo={require('../../assets/img/logobig-zingo-delegator.png')}
                logoSize={30}
                logoBackgroundColor={colors.text}
                logoBorderRadius={5} /* android not soported */ 
                logoMargin={3}
              />
            </View>

            <View 
              style={{
                marginTop: 40,
                backgroundColor: colors.secondary,
                padding: 10,
                width: '90%',
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Address
                address={address?.address ? address.address : ''}
                style={{ color: colors.money, fontSize: 18, opacity: 0.8 }}
                onPress={() => show('EA')}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <TouchableOpacity onPress={doCopy}>
                  <View
                    style={{
                      borderRadius: 30,
                      borderColor: colors.zingo,
                      paddingHorizontal: 5,
                      paddingVertical: 5,
                      marginHorizontal: 10,
                    }}>
                    <CopyIcon color={colors.money} size={24} opacity={0.9} style={{ margin: 3 }} />
                  </View>
                </TouchableOpacity>
              </View>
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
            }}>
            <RegText>{address ? address.address : ''}</RegText>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SingleAddress;
