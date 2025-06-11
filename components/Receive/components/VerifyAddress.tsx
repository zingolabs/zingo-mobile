/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View, TouchableOpacity, Keyboard } from 'react-native';
import { useTheme } from '@react-navigation/native';

import {
  ButtonTypeEnum,
  GlobalConst,
  SnackbarDurationEnum,
} from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import Button from '../../Components/Button';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { useToast } from 'react-native-toastier';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import RPCModule from '../../../app/RPCModule';
import { parseZcashURI, ZcashURITargetClass } from '../../../app/uris';
import TextInputAddress from '../../Components/TextInputAddress';
import FadeText from '../../Components/FadeText';
import RegText from '../../Components/RegText';
import { RPCCheckAddressType } from '../../../app/rpc/types/RPCCheckAddressType';

type VerifyAddressProps = {
  closeSheet: () => void;
};
const VerifyAddress: React.FunctionComponent<VerifyAddressProps> = ({
  closeSheet,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, addLastSnackbar, server } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);
  const { clear } = useToast();

  const [address, setAddress] = useState<string>('');
  const [errorAddress, setErrorAddress] = useState<string>('');
  const [verifyOK, setVerifyOK] = useState<boolean | null>(null);

  const verifyAddress = async () => {
    try {
      const verifyAddressStr = await RPCModule.checkMyAddressInfo(address);
      console.log(verifyAddressStr);
      if (verifyAddressStr) {
        if (verifyAddressStr.toLowerCase().startsWith(GlobalConst.error)) {
          console.log(`Error new address ${verifyAddressStr}`);
          addLastSnackbar({
            message: verifyAddressStr,
            duration: SnackbarDurationEnum.short,
          });
          setErrorAddress(verifyAddressStr);
        }
      } else {
        console.log('Internal Error new address ');
      }

      const verifyAddressJSON: RPCCheckAddressType = await JSON.parse(verifyAddressStr);
      setVerifyOK(verifyAddressJSON.is_wallet_address);

      //return newAddressStr;
    } catch (error) {
      console.log(`Critical Error new address ${error}`);
      //return `Error: ${error}`;
    }

    Keyboard.dismiss();
    clear();
  };

    const updateAddress = async (addr: string) => {
    if (!addr) {
      setAddress('');
      return;
    }
    let newAddress: string = addr;
    // Attempt to parse as URI if it starts with zcash
    if (addr.toLowerCase().startsWith(GlobalConst.zcash)) {
      const target: string | ZcashURITargetClass = await parseZcashURI(addr, translate, server);
      //console.log(targets);

      if (typeof target !== 'string') {
        // redo the to addresses
        [target].forEach(tgt => {
          newAddress = tgt.address || '';
        });
      } else {
        // Show the error message as a toast
        addLastSnackbar({ message: target });
        //return;
      }
    } else {
      newAddress = addr.replace(/[ \t\n\r]+/g, ''); // Remove spaces
    }

    setAddress(newAddress);
  };

  return (
    <View style={{
      backgroundColor: colors.background,
    }}>
      <TouchableOpacity
        onPress={() => {
          setAddress('');
          Keyboard.dismiss();
          clear();
          setTimeout(() => {
            closeSheet();
          }, 100);
        }}
      >
        <FontAwesomeIcon size={30} icon={faXmark} color={colors.text} style={{ marginTop: 10, marginRight: 20, alignSelf: 'flex-end' }} />
      </TouchableOpacity>
      <RegText style={{ marginTop: 0, paddingHorizontal: 10, alignSelf: 'center' }}>
        {translate('receive.verify') as string}
      </RegText>
      <TextInputAddress
        address={address}
        setAddress={updateAddress}
        setError={setErrorAddress}
        disabled={false}
        showLabel={false}
      />
      {(!!errorAddress) && (
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}>
          <FadeText style={{ color: colors.primary }}>{errorAddress}</FadeText>
        </View>
      )}
      {(verifyOK !== null) && (
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}>
          <FadeText style={{ color: colors.primary }}>{verifyOK ? 'good' : 'bad'}</FadeText>
        </View>
      )}
      <View
        style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
            marginTop: 30,
          }}>
          <Button
            type={ButtonTypeEnum.Primary}
            title={translate('verify') as string}
            onPress={() => {
              verifyAddress();
            }}
            twoButtons={true}
            disabled={!address || !!errorAddress}
          />
          <Button
            type={ButtonTypeEnum.Secondary}
            title={translate('cancel') as string}
            style={{ marginLeft: 10 }}
            onPress={() => {
              setAddress('');
              Keyboard.dismiss();
              clear();
              setTimeout(() => {
                closeSheet();
              }, 100);
            }}
            twoButtons={true}
          />
        </View>
      </View>
    </View>
  );
};

export default React.memo(VerifyAddress);
