/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, TouchableOpacity, Keyboard } from 'react-native';
import { useTheme } from '@react-navigation/native';

import {
  ButtonTypeEnum,
  GlobalConst,
  ScreenEnum,
  SnackbarDurationEnum,
} from '../../../app/AppState';
import { ContextAppLoaded } from '../../../app/context';
import Button from '../../Components/Button';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import RPCModule from '../../../app/RPCModule';
import { parseZcashURI } from '../../../app/uris';
import TextInputAddress from '../../Components/TextInputAddress';
import FadeText from '../../Components/FadeText';
import RegText from '../../Components/RegText';
import { RPCCheckAddressType } from '../../../app/walletBackend/types/RPCCheckAddressType';
import { VerifyCheckIcon } from '../../Components/Icons/VerifyCheckIcon';
import { VerifyXIcon } from '../../Components/Icons/VerifyXIcon';

type VerifyAddressProps = {
  closeSheet: () => void;
  screenName: ScreenEnum;
  setHeightLayout: (h: number) => void;
};
const VerifyAddress: React.FunctionComponent<VerifyAddressProps> = ({
  closeSheet,
  screenName,
  setHeightLayout,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addLastSnackbar, server } = context;
  const { colors } = useTheme();

  const [address, setAddress] = useState<string>('');
  const [errorAddress, setErrorAddress] = useState<string>('');
  const [verifyOK, setVerifyOK] = useState<boolean | null>(null);

  const verifyAddress = async () => {
    try {
      const verifyAddressStr = await RPCModule.checkMyAddressInfo(address);
      //console.log(verifyAddressStr);
      if (verifyAddressStr) {
        if (verifyAddressStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error new address ${verifyAddressStr}`);
          addLastSnackbar(verifyAddressStr, SnackbarDurationEnum.short);
          setErrorAddress(verifyAddressStr);
        }
      } else {
        console.log('Internal Error new address ');
      }

      const verifyAddressJSON: RPCCheckAddressType =
        await JSON.parse(verifyAddressStr);
      setVerifyOK(verifyAddressJSON.is_wallet_address);

      //return newAddressStr;
    } catch (error) {
      console.log(`Critical Error new address ${error}`);
      //return `Error: ${error}`;
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
      const { error, target } = await parseZcashURI(addr, translate, server);
      //console.log(targets);

      if (target) {
        // redo the to addresses
        [target].forEach(tgt => {
          if (tgt.address) {
            setAddress(tgt.address);
          }
        });
      }
      if (error) {
        // Show the error message as a toast
        addLastSnackbar(error);
        //return;
      }
    } else {
      setAddress(addr.replace(/[ \t\n\r]+/g, '')); // Remove spaces
    }
  };

  return (
    <View
      onLayout={e => {
        const { height } = e.nativeEvent.layout;
        //console.log('LAYOUTTT', height);
        setHeightLayout(height + 70);
      }}
      style={{
        backgroundColor: colors.background,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          setAddress('');
          Keyboard.dismiss();
          setTimeout(() => {
            closeSheet();
          }, 100);
        }}
      >
        <FontAwesomeIcon
          size={30}
          icon={faXmark}
          color={colors.text}
          style={{ marginTop: 10, marginRight: 20, alignSelf: 'flex-end' }}
        />
      </TouchableOpacity>
      <RegText
        style={{ marginTop: 0, paddingHorizontal: 10, alignSelf: 'center' }}
      >
        {translate('receive.verify') as string}
      </RegText>
      <TextInputAddress
        address={address}
        setAddress={updateAddress}
        setError={setErrorAddress}
        disabled={false}
        showLabel={false}
        screenName={screenName}
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
            marginVertical: 5,
            marginTop: 30,
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
            style={{ marginLeft: 10 }}
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
