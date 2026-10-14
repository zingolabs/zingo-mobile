/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '@app/theme';
import { ScanIcon } from '@ui/primitives/Icons/ScanIcon';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

import { ContextAppLoaded } from '@app/context';
import { Request, useResult } from '@app/navigation/results';
import { openScanner } from '@app/navigation/navigate';
import ErrorText from '@ui/primitives/ErrorText';
import RegText from '@ui/primitives/RegText';
import { validateAddressForChain } from '@app/swap';
import { GlobalConst, Route } from '@app/AppState';

type TextInputAddressProps = {
  address: string;
  setAddress: (a: string) => void;
  setError: (e: string) => void;
  disabled: boolean;
  showLabel: boolean;
  routeStack?: Route;
  // SwapKit chain code the address is for ('ZEC' / 'BTC' / ...). Defaults to
  // 'ZEC' → the existing zingolib validation (against `server.chainName`).
  // Non-ZEC values validate by the format-only per-chain regex.
  swapChain?: string;
  // The request the scanner answers with the code it read.
  scanRequest: Request;
};
const TextInputAddress: React.FunctionComponent<TextInputAddressProps> = ({
  address,
  setAddress,
  setError,
  disabled,
  showLabel,
  swapChain,
  scanRequest,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server } = context;
  const { colors } = useTheme();

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

  useResult(scanRequest, a => setAddress(a));
  // A swap chain's address is checked by its own format.
  const setQrcodeModalShow = () => {
    const chain = swapChain ?? GlobalConst.zecSwapChain;
    openScanner({
      request: scanRequest,
      accepts:
        chain === GlobalConst.zecSwapChain
          ? { kind: 'zcash', chain: server.chainName }
          : { kind: 'chain', chain },
      texts: {
        title: translate('scanner.title') as string,
        hint: translate('scanner.hint-address') as string,
        miss: translate('scanner.miss-address') as string,
        found: translate('scanner.found') as string,
        back: translate('scanner.back') as string,
        torch: translate('scanner.torch') as string,
      },
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
              <FontAwesomeIcon icon={faCheck} color={colors.fgAccent} />
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
            borderColor: colors.borderMuted,
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
                placeholderTextColor={colors.fgMuted}
                style={{
                  color: colors.fgDefault,
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
              {!!address && !disabled && (
                <TouchableOpacity
                  onPress={() => {
                    setAddress('');
                  }}
                >
                  <FontAwesomeIcon
                    style={{ marginRight: 5 }}
                    size={20}
                    icon={faXmark}
                    color={colors.fgAccentDisabled}
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
                <ScanIcon
                  style={{ marginRight: 5 }}
                  size={28}
                  color={colors.fgMuted}
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
