/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faQrcode, faXmark } from '@fortawesome/free-solid-svg-icons';

import { ContextAppLoaded } from '../../app/context';
import { ThemeType } from '../../app/types';
import ErrorText from './ErrorText';
import RegText from './RegText';
import { validateAddressForChain } from '../../app/swap';
import { GlobalConst, RouteEnum, ScreenEnum } from '../../app/AppState';

type TextInputAddressProps = {
  address: string;
  setAddress: (a: string) => void;
  setError: (e: string) => void;
  disabled: boolean;
  showLabel: boolean;
  screenName: ScreenEnum;
  routeStack?: RouteEnum;
  // SwapKit chain code the address is for ('ZEC' / 'BTC' / ...). Defaults to
  // 'ZEC' → the existing zingolib validation (against `server.chainName`).
  // Non-ZEC values validate by the format-only per-chain regex.
  swapChain?: string;
  // When rendered inside a BottomSheetModal (or any portaled context where
  // useNavigation's context is lost), pass the navigation prop from the host
  // screen so the QR button can navigate to ScannerAddress reliably.
  navigation?: NavigationProp<ParamListBase>;
};
const TextInputAddress: React.FunctionComponent<TextInputAddressProps> = ({
  address,
  setAddress,
  setError,
  disabled,
  showLabel,
  // screenName + routeStack are kept in the prop type for backward compat
  // with all callers but are no longer consumed here — ScannerAddress lives
  // at a single Drawer-level route so a direct navigate works everywhere.
  navigation: navigationProp,
  swapChain,
}) => {
  const hookNavigation = useNavigation<NavigationProp<ParamListBase>>();
  const navigation = navigationProp ?? hookNavigation;
  const context = useContext(ContextAppLoaded);
  const { translate, server } = context;
  const { colors } = useTheme() as ThemeType;

  const [validAddress, setValidAddress] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO

  useEffect(() => {
    let cancelled = false;

    if (address) {
      validateAddressForChain(
        swapChain ?? GlobalConst.zecSwapChain,
        address,
        server.chainName,
      ).then(valid => {
        if (!cancelled) {
          setValidAddress(valid ? 1 : -1);
          setError(valid ? '' : (translate('send.invalidaddress') as string));
        }
      });
    } else {
      setValidAddress(0);
      setError('');
    }

    return () => {
      cancelled = true;
    };
  }, [address, server.chainName, swapChain, setError, translate]);

  const setQrcodeModalShow = () => {
    // ScannerAddress is a top-level (root Stack) screen, so a direct navigate
    // works from any caller (Receive, Send, etc.) regardless of which stack
    // they live in.
    navigation.navigate(RouteEnum.ScannerAddress, {
      setAddress: (a: string) => setAddress(a),
      active: true,
      // Non-ZEC chains take the scanned string verbatim (no `zcash:` prefix).
      raw: (swapChain ?? GlobalConst.zecSwapChain) !== GlobalConst.zecSwapChain,
    });
  };

  //console.log('render input text address');

  return (
    <View style={{ display: 'flex', flexDirection: 'column' }}>
      <View style={{ display: 'flex', padding: 10, marginTop: 10 }}>
        {showLabel && (
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <RegText>{translate('send.toaddress') as string}</RegText>
            {validAddress === 1 && (
              <FontAwesomeIcon icon={faCheck} color={colors.primary} />
            )}
            {validAddress === -1 && (
              <ErrorText>
                {translate('send.invalidaddress') as string}
              </ErrorText>
            )}
          </View>
        )}
        <View
          style={{
            borderWidth: 1,
            borderRadius: 12,
            borderColor: colors.border,
            marginTop: 5,
          }}
        >
          <View style={{ flexDirection: 'row' }}>
            <View
              accessible={true}
              accessibilityLabel={translate('send.address-acc') as string}
              style={{
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <TextInput
                testID="send.addressplaceholder"
                placeholder={translate('send.addressplaceholder') as string}
                placeholderTextColor={colors.placeholder}
                style={{
                  color: colors.text,
                  fontWeight: '600',
                  fontSize: 14,
                  padding: 10,
                  backgroundColor: 'transparent',
                }}
                value={address}
                onChangeText={(text: string) => setAddress(text)}
                editable={!disabled}
              />
            </View>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {address && !disabled && (
                <TouchableOpacity
                  onPress={() => {
                    setAddress('');
                  }}
                >
                  <FontAwesomeIcon
                    style={{ marginRight: 5 }}
                    size={20}
                    icon={faXmark}
                    color={colors.primaryDisabled}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID="send.scan-button"
                disabled={disabled}
                accessible={true}
                accessibilityLabel={translate('send.scan-acc') as string}
                hitSlop={8}
                onPress={() => {
                  setQrcodeModalShow();
                }}
              >
                <FontAwesomeIcon
                  style={{ marginRight: 5 }}
                  size={28}
                  icon={faQrcode}
                  color={colors.border}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default TextInputAddress;
