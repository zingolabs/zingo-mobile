/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme, slopFor } from '@app/theme';
import { ScanIcon } from '@ui/primitives/Icons/ScanIcon';
import { ClipboardPasteIcon } from '@ui/primitives/Icons/ClipboardPasteIcon';

import { ContextAppLoaded } from '@app/context';
import { Request, useResult } from '@app/navigation/results';
import { openScanner } from '@app/navigation/navigate';
import ErrorText from '@ui/primitives/ErrorText';
import RegText from '@ui/primitives/RegText';
import { addressFromPaymentUri, validateAddressForChain } from '@app/swap';
import { GlobalConst } from '@app/AppState';
import { chainDisplayName } from '@ui/widgets/chainDisplayName';
import { fieldBorder } from '@ui/primitives/fieldBorder';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';

type TextInputAddressProps = {
  address: string;
  setAddress: (a: string) => void;
  setError: (e: string) => void;
  disabled: boolean;
  showLabel: boolean;
  // SwapKit chain code the address is for ('ZEC' / 'BTC' / ...). Defaults to
  // 'ZEC' → the existing zingolib validation (against `server.chainName`).
  // Non-ZEC values validate by the format-only per-chain regex.
  swapChain?: string;
  // The request the scanner answers with the code it read.
  scanRequest: Request;
  /** Names the paste button the empty field shows; no label, no button. */
  pasteLabel?: string;
  /** Replaces the Zcash hint (address or ZNS name) for another chain's field. */
  placeholder?: string;
};
const TextInputAddress: React.FunctionComponent<TextInputAddressProps> = ({
  address,
  setAddress,
  setError,
  disabled,
  showLabel,
  swapChain,
  scanRequest,
  pasteLabel,
  placeholder,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server } = context;
  const { colors } = useTheme();

  const [validAddress, setValidAddress] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO
  const [focused, setFocused] = useState(false);

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

  /** A swap chain's field keeps the address out of a payment URI for it. */
  const take = (text: string) =>
    setAddress(
      swapChain && swapChain !== GlobalConst.zecSwapChain
        ? addressFromPaymentUri(swapChain, text)
        : text,
    );

  useResult(scanRequest, take);
  // A swap chain's address is checked by its own format.
  const setQrcodeModalShow = () => {
    const chain = swapChain ?? GlobalConst.zecSwapChain;
    const zcash = chain === GlobalConst.zecSwapChain;
    const named = (key: string) =>
      (translate(key) as string).replace(
        '{chain}',
        chainDisplayName(chain) || chain,
      );
    openScanner({
      request: scanRequest,
      // A Zcash field takes an address or a payment URI, as when pasted.
      accepts: zcash
        ? { kind: 'zcash', chain: server.chainName }
        : { kind: 'chain', chain, network: server.chainName },
      texts: {
        title: translate('scanner.title') as string,
        hint: zcash
          ? (translate('scanner.hint-address') as string)
          : named('scanner.hint-chain'),
        miss: zcash
          ? (translate('scanner.miss-address') as string)
          : named('scanner.miss-chain'),
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
              <CheckIcon size={16} color={colors.fgAccent} />
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
            borderColor: fieldBorder(
              colors,
              focused,
              validAddress === 1
                ? 'valid'
                : validAddress === -1
                  ? 'invalid'
                  : 'unknown',
            ),
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
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={
                  placeholder ??
                  (translate('send.addressplaceholder') as string)
                }
                placeholderTextColor={colors.fgMuted}
                style={{
                  color: colors.fgDefault,
                  fontWeight: '600',
                  fontSize: 15,
                  padding: 10,
                }}
                value={address}
                onChangeText={take}
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
                  hitSlop={slopFor(20)}
                  onPress={() => {
                    setAddress('');
                  }}
                >
                  <XIcon
                    style={{ marginRight: 5 }}
                    size={20}
                    color={colors.fgAccentDisabled}
                  />
                </TouchableOpacity>
              )}
              {!address && !disabled && !!pasteLabel && (
                <TouchableOpacity
                  testID="send.paste-button"
                  accessibilityRole="button"
                  accessibilityLabel={pasteLabel}
                  hitSlop={8}
                  onPress={async () => take(await Clipboard.getString())}
                  style={{ marginRight: 12 }}
                >
                  <ClipboardPasteIcon size={22} color={colors.fgMuted} />
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
                  size={24}
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
