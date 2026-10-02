/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Keyboard } from 'react-native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useTheme } from '@app/theme';

import { GlobalConst, ScreenEnum, SnackbarDurationEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import Button, { ButtonTypeEnum } from '@ui/primitives/Button';
import { checkMyAddress } from '@app/walletBackend';
import { parseZcashURI } from '@app/uris';
import Utils from '@app/utils';
import TextInputAddress from '@ui/widgets/TextInputAddress';
import FadeText from '@ui/primitives/FadeText';
import { RPCCheckAddressType } from '@app/walletBackend/types/RPCCheckAddressType';
import { VerifyCheckIcon } from '@ui/primitives/Icons/VerifyCheckIcon';
import { VerifyXIcon } from '@ui/primitives/Icons/VerifyXIcon';

type VerifyAddressProps = {
  closeSheet: () => void;
  screenName: ScreenEnum;
  // VerifyAddress lives inside a portaled BottomSheetModal; pass navigation
  // from the host (Receive) so the QR button can navigate to ScannerAddress.
  navigation: NavigationProp<ParamListBase>;
};
type Verification =
  { kind: 'unchecked' } | { kind: 'checked'; isWalletAddress: boolean };

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
  const [verification, setVerification] = useState<Verification>({
    kind: 'unchecked',
  });
  const [parsing, setParsing] = useState(false);
  const revision = useRef(0);

  useEffect(() => {
    setVerification({ kind: 'unchecked' });
    setParsing(false);
    return () => {
      revision.current += 1;
    };
  }, [server.chainName]);

  const verifyAddress = async () => {
    if (!address || errorAddress || parsing) {
      return;
    }
    const request = ++revision.current;
    setVerification({ kind: 'unchecked' });
    Keyboard.dismiss();
    try {
      const verifyAddressResult = await checkMyAddress(address);
      if (request !== revision.current) {
        return;
      }
      if (!verifyAddressResult.ok) {
        addLastSnackbar(
          verifyAddressResult.error.message,
          SnackbarDurationEnum.short,
        );
        setErrorAddress(verifyAddressResult.error.message);
      } else {
        const verifyAddressJSON: RPCCheckAddressType = JSON.parse(
          verifyAddressResult.value,
        );
        setVerification({
          kind: 'checked',
          isWalletAddress: verifyAddressJSON.is_wallet_address,
        });
      }
    } catch (error) {
      if (request !== revision.current) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      addLastSnackbar(message, SnackbarDurationEnum.short);
      setErrorAddress(message);
    }
  };

  const updateAddress = async (addr: string) => {
    const request = ++revision.current;
    setVerification({ kind: 'unchecked' });
    setParsing(false);
    if (!addr) {
      setAddress('');
      return;
    }
    // Attempt to parse as URI if it starts with zcash
    if (
      addr.toLowerCase().startsWith(GlobalConst.zcash) ||
      addr.toLowerCase().includes(':')
    ) {
      setParsing(true);
      const parsed = await parseZcashURI(addr, server);
      if (request !== revision.current) {
        return;
      }
      setParsing(false);

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
      {verification.kind === 'checked' && (
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}
        >
          {verification.isWalletAddress ? (
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
              updateAddress('');
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
            disabled={!address || !!errorAddress || parsing}
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(VerifyAddress);
