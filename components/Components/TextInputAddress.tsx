/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faQrcode, faXmark } from '@fortawesome/free-solid-svg-icons';

import { ContextAppLoaded } from '../../app/context';
import { ThemeType } from '../../app/types';
import ErrorText from './ErrorText';
import RegText from './RegText';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import Utils from '../../app/utils';
import { RouteEnum } from '../../app/AppState';

type TextInputAddressProps = {
  address: string;
  setAddress: (a: string) => void;
  setError: (e: string) => void;
  disabled: boolean;
  showLabel: boolean;
  navigation: any;
};
const TextInputAddress: React.FunctionComponent<TextInputAddressProps> = ({
  address,
  setAddress,
  setError,
  disabled,
  showLabel,
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server, language } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);

  const [validAddress, setValidAddress] = useState<number>(0); // 1 - OK, 0 - Empty, -1 - KO

  useEffect(() => {
    const parseAddress = async (addr: string): Promise<{ isValid: boolean; onlyOrchardUA: string }> => {
      return await Utils.isValidAddress(addr, server.chainName);
    };

    if (address) {
      parseAddress(address).then(r => {
        //console.log(r);
        setValidAddress(r.isValid ? 1 : -1);
        setError(r.isValid ? '' : (translate('send.invalidaddress') as string));
      });
    } else {
      setValidAddress(0);
      setError('');
    }
  }, [address, server.chainName, setError, translate]);

  const setQrcodeModalShow = () => {
    navigation.navigate(RouteEnum.ScannerAddress, { 
      setAddress: (a: string) => setAddress(a),
      active: true,
    })
  };

  //console.log('render input text address');

  return (
    <View style={{ display: 'flex', flexDirection: 'column' }}>
      <View style={{ display: 'flex', padding: 10, marginTop: 10 }}>
        {showLabel && (
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
            <RegText>{translate('send.toaddress') as string}</RegText>
            {validAddress === 1 && <FontAwesomeIcon icon={faCheck} color={colors.primary} />}
            {validAddress === -1 && <ErrorText>{translate('send.invalidaddress') as string}</ErrorText>}
          </View>
        )}
        <View
          style={{
            borderWidth: 1,
            borderRadius: 5,
            borderColor: colors.text,
            marginTop: 5,
          }}>
          <View style={{ flexDirection: 'row' }}>
            <View
              accessible={true}
              accessibilityLabel={translate('send.address-acc') as string}
              style={{
                flex: 1,
                justifyContent: 'center',
              }}>
              <TextInput
                testID="send.addressplaceholder"
                placeholder={translate('send.addressplaceholder') as string}
                placeholderTextColor={colors.placeholder}
                style={{
                  color: colors.text,
                  fontWeight: '600',
                  fontSize: 14,
                  marginLeft: 5,
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
              }}>
              {address && !disabled && (
                <TouchableOpacity
                  onPress={() => {
                    setAddress('');
                  }}>
                  <FontAwesomeIcon style={{ marginRight: 5 }} size={25} icon={faXmark} color={colors.primaryDisabled} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID="send.scan-button"
                disabled={disabled}
                accessible={true}
                accessibilityLabel={translate('send.scan-acc') as string}
                onPress={() => {
                  setQrcodeModalShow();
                }}>
                <FontAwesomeIcon style={{ marginRight: 5 }} size={35} icon={faQrcode} color={colors.border} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default TextInputAddress;
