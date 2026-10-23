/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, Keyboard } from 'react-native';
import { space8, space20, useTheme } from '@app/theme';

import { GlobalConst, SnackbarDurationEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import Button from '@ui/primitives/Button';
import ButtonStack from '@ui/primitives/ButtonStack';
import { checkMyAddress } from '@app/walletBackend';
import { parseZcashURI } from '@app/uris';
import Utils from '@app/utils';
import TextInputAddress from '@ui/widgets/TextInputAddress';
import FadeText from '@ui/primitives/FadeText';
import Text from '@ui/primitives/Text';
import { RPCCheckAddressType } from '@app/walletBackend/types/RPCCheckAddressType';
import { VerifyCheckIcon } from '@ui/primitives/Icons/VerifyCheckIcon';
import { VerifyXIcon } from '@ui/primitives/Icons/VerifyXIcon';

type VerifyAddressProps = {
  closeSheet: () => void;
};
const VerifyAddress: React.FunctionComponent<VerifyAddressProps> = ({
  closeSheet,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar, server } = context;
  const { colors } = useTheme();

  const [address, setAddress] = useState<string>('');
  const [errorAddress, setErrorAddress] = useState<string>('');
  const [verifyOK, setVerifyOK] = useState<boolean | null>(null);

  const verifyAddress = async () => {
    try {
      const verifyAddressResult = await checkMyAddress(address);
      if (!verifyAddressResult.ok) {
        addLastSnackbar(
          verifyAddressResult.error.message,
          SnackbarDurationEnum.short,
        );
        setErrorAddress(verifyAddressResult.error.message);
      } else {
        const verifyAddressJSON: RPCCheckAddressType = await JSON.parse(
          verifyAddressResult.value,
        );
        setVerifyOK(verifyAddressJSON.is_wallet_address);
      }
    } catch (error) {
      console.log(`Critical Error new address ${error}`);
    }

    Keyboard.dismiss();
  };

  const updateAddress = async (addr: string) => {
    setVerifyOK(null);
    if (!addr) {
      setAddress('');
      return;
    }
    // Attempt to parse as URI if it starts with zcash
    if (
      addr.toLowerCase().startsWith(GlobalConst.zcash) ||
      addr.toLowerCase().includes(':')
    ) {
      const parsed = await parseZcashURI(addr, server);

      // Audit Issue H — surface the parser error and abort before any
      // address-state mutation. A failure result carries no target, so a
      // malformed URI cannot reach the state updates below.
      if (parsed.kind === 'error') {
        addLastSnackbar(Utils.renderErrorKeyed(parsed, translate));
        return;
      }

      const target = parsed.target;
      if (target) {
        // redo the to addresses
        [target].forEach(tgt => {
          if (tgt.address) {
            setAddress(tgt.address);
          }
        });
      }
    } else {
      setAddress(addr.replace(/[ \t\n\r]+/g, '')); // Remove spaces
    }
  };

  return (
    <View
      style={{
        backgroundColor: colors.bgSurface,
      }}
    >
      <Text
        variant="caption"
        tone="muted"
        style={{
          textAlign: 'center',
          marginHorizontal: space20,
          marginBottom: space8,
        }}
      >
        {translate('receive.verify-sub') as string}
      </Text>
      <TextInputAddress
        address={address}
        setAddress={updateAddress}
        setError={setErrorAddress}
        disabled={false}
        showLabel={false}
        scanRequest="receive.address"
      />
      {!!errorAddress && (
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}
        >
          <FadeText style={{ color: colors.fgDanger }}>{errorAddress}</FadeText>
        </View>
      )}
      {verifyOK !== null && (
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}
        >
          {verifyOK ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '90%',
              }}
            >
              <VerifyCheckIcon
                color={colors.fgAccent}
                style={{ marginRight: 10 }}
              />
              <FadeText
                testID="receive.verify-mine"
                style={{ color: colors.fgAccent, flexShrink: 1 }}
              >
                {translate('receive.verification-success') as string}
              </FadeText>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '90%',
              }}
            >
              <VerifyXIcon
                color={colors.fgDanger}
                style={{ marginRight: 10 }}
              />
              <FadeText
                testID="receive.verify-not-mine"
                style={{ color: colors.fgDanger, flexShrink: 1 }}
              >
                {translate('receive.verification-failure') as string}
              </FadeText>
            </View>
          )}
        </View>
      )}
      <View style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 10,
            marginVertical: 5,
            marginTop: 15,
          }}
        >
          <ButtonStack>
            <Button
              variant="quiet"
              title={translate('cancel') as string}
              onPress={() => {
                setAddress('');
                setVerifyOK(null);
                Keyboard.dismiss();
                setTimeout(() => {
                  closeSheet();
                }, 100);
              }}
            />
            <Button
              variant="primary"
              title={translate('verify') as string}
              onPress={() => {
                verifyAddress();
              }}
              disabled={!address || !!errorAddress}
            />
          </ButtonStack>
        </View>
      </View>
    </View>
  );
};

export default React.memo(VerifyAddress);
