/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, Keyboard } from 'react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useTheme } from '../../../app/theme';

import {
  ButtonTypeEnum,
  GlobalConst,
  ScreenEnum,
  SnackbarDurationEnum,
} from '../../../app/AppState';
import { ContextAppLoaded } from '../../../app/context';
import Button from '../../ui/Button';
import { checkMyAddress } from '../../../app/walletBackend';
import { parseZcashURI } from '../../../app/uris';
import Utils from '../../../app/utils';
import TextInputAddress from '../../ui/TextInputAddress';
import FadeText from '../../ui/FadeText';
import { RPCCheckAddressType } from '../../../app/walletBackend/types/RPCCheckAddressType';
import { VerifyCheckIcon } from '../../ui/Icons/VerifyCheckIcon';
import { VerifyXIcon } from '../../ui/Icons/VerifyXIcon';

type VerifyAddressProps = {
  closeSheet: () => void;
  screenName: ScreenEnum;
  // VerifyAddress lives inside a portaled BottomSheetModal; pass navigation
  // from the host (Receive) so the QR button can navigate to ScannerAddress.
  navigation: NavigationProp<ParamListBase>;
};
const VerifyAddress: React.FunctionComponent<VerifyAddressProps> = ({
  closeSheet,
  screenName,
  navigation,
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
      <TextInputAddress
        address={address}
        setAddress={updateAddress}
        setError={setErrorAddress}
        disabled={false}
        showLabel={false}
        screenName={screenName}
        navigation={navigation}
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
          <FadeText style={{ color: colors.fgAccent }}>{errorAddress}</FadeText>
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
              <FadeText style={{ color: colors.fgDefault }}>
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
                color={colors.fgDangerEmphasis}
                style={{ marginRight: 10 }}
              />
              <FadeText style={{ color: colors.fgDefault }}>
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
          <Button
            type={ButtonTypeEnum.Secondary}
            title={translate('cancel') as string}
            onPress={() => {
              setAddress('');
              Keyboard.dismiss();
              setTimeout(() => {
                closeSheet();
              }, 100);
            }}
            twoButtons={true}
          />
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('verify') as string}
            onPress={() => {
              verifyAddress();
            }}
            twoButtons={true}
            disabled={!address || !!errorAddress}
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(VerifyAddress);
