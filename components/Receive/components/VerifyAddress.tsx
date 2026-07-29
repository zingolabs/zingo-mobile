/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, Keyboard } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useTheme,
} from '@react-navigation/native';

import {
  ButtonTypeEnum,
  GlobalConst,
  ScreenEnum,
  SnackbarDurationEnum,
} from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import Button from '../../Components/Button';
import { checkMyAddress } from '../../../app/walletBackend';
import { parseZcashURI } from '../../../app/uris';
import TextInputAddress from '../../Components/TextInputAddress';
import FadeText from '../../Components/FadeText';
import {
  CheckAddressVerdict,
  interpretCheckAddressResult,
} from './checkAddressVerdict';
import { VerifyCheckIcon } from '../../Components/Icons/VerifyCheckIcon';
import { VerifyXIcon } from '../../Components/Icons/VerifyXIcon';

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
  const { colors } = useTheme() as ThemeType;

  const [address, setAddress] = useState<string>('');
  const [errorAddress, setErrorAddress] = useState<string>('');
  const [verdict, setVerdict] = useState<CheckAddressVerdict>({
    kind: 'unattempted',
  });

  const verifyAddress = async () => {
    const result = interpretCheckAddressResult(await checkMyAddress(address));

    // A failed check must never reach the verdict rows: rendering "this
    // address does not belong to you" when the backend never answered is a
    // confident false negative on a verification screen.
    if (result.kind === 'ffiRejection') {
      console.log(`Error new address ${result.code} ${result.message}`);
      addLastSnackbar(result.message, SnackbarDurationEnum.short);
      setErrorAddress(result.message);
    } else if (result.kind === 'malformed') {
      console.log(`Internal Error new address ${result.reason}`);
      addLastSnackbar(
        translate('receive.verification-unavailable') as string,
        SnackbarDurationEnum.short,
      );
    }
    setVerdict(result);

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
      const { error, target } = await parseZcashURI(addr, translate, server);

      // Audit Issue H — surface the parser error and abort before any
      // address-state mutation. parseZcashURI returns an empty target
      // when error is non-empty, but the explicit guard keeps intent
      // obvious here and protects against future contract changes.
      if (error) {
        addLastSnackbar(error);
        return;
      }

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
        backgroundColor: colors.bottomSheetBackground,
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
          <FadeText style={{ color: colors.primary }}>{errorAddress}</FadeText>
        </View>
      )}
      {(verdict.kind === 'mine' || verdict.kind === 'notMine') && (
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}
        >
          {verdict.kind === 'mine' ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '90%',
              }}
            >
              <VerifyCheckIcon
                color={colors.primary}
                style={{ marginRight: 10 }}
              />
              <FadeText style={{ color: colors.text }}>
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
                color={colors.danger.primary}
                style={{ marginRight: 10 }}
              />
              <FadeText style={{ color: colors.text }}>
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
