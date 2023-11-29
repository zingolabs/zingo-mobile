/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faQrcode } from '@fortawesome/free-solid-svg-icons';
//import { TouchableOpacity } from 'react-native-gesture-handler';

import { ContextAppLoaded } from '../../app/context';
import ScannerAddress from '../Send/components/ScannerAddress';
import RPCModule from '../../app/RPCModule';
import { RPCParseAddressType } from '../../app/rpc/types/RPCParseAddressType';
import { ThemeType } from '../../app/types';
import ErrorText from './ErrorText';
import RegText from './RegText';

type InputTextAddressProps = {
  address: string;
  setAddress: (a: string) => void;
  setError: (e: string) => void;
  disabled: boolean;
};
const InputTextAddress: React.FunctionComponent<InputTextAddressProps> = ({
  address,
  setAddress,
  setError,
  disabled,
}) => {
  const context = useContext(ContextAppLoaded);
  const { netInfo, addLastSnackbar, translate, server } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [qrcodeModalVisble, setQrcodeModalVisible] = useState(false);
  const [validAddress, setValidAddress] = useState(0); // 1 - OK, 0 - Empty, -1 - KO

  useEffect(() => {
    const parseAdressJSON = async (addr: string): Promise<boolean> => {
      if (!netInfo.isConnected) {
        addLastSnackbar({ message: translate('loadedapp.connection-error') as string, type: 'Primary' });
        return false;
      }
      const result: string = await RPCModule.execute('parse_address', addr);
      if (result) {
        if (result.toLowerCase().startsWith('error') || result.toLowerCase() === 'null') {
          return false;
        }
      } else {
        return false;
      }
      // TODO: check if the json parse is correct.
      const resultJSON: RPCParseAddressType = await JSON.parse(result);

      //console.log('parse-address', address, resultJSON.status === 'success');

      return resultJSON.status === 'success' && resultJSON.chain_name === server.chain_name;
    };

    if (address) {
      parseAdressJSON(address).then(r => {
        setValidAddress(r ? 1 : -1);
        setError(r ? '' : (translate('send.invalidaddress') as string));
      });
    } else {
      setValidAddress(0);
    }
  }, [addLastSnackbar, address, netInfo.isConnected, server.chain_name, setError, translate]);

  console.log('render input text address');

  return (
    <View style={{ display: 'flex', flexDirection: 'column' }}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={qrcodeModalVisble}
        onRequestClose={() => setQrcodeModalVisible(false)}>
        <ScannerAddress setAddress={setAddress} closeModal={() => setQrcodeModalVisible(false)} />
      </Modal>
      <View style={{ display: 'flex', padding: 10, marginTop: 10 }}>
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <RegText>{translate('send.toaddress') as string}</RegText>
          {validAddress === 1 && <FontAwesomeIcon icon={faCheck} color={colors.primary} />}
          {validAddress === -1 && <ErrorText>{translate('send.invalidaddress') as string}</ErrorText>}
        </View>
        <View
          style={{
            flex: 1,
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
                  fontSize: 16,
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
                width: 58,
              }}>
              <TouchableOpacity
                testID="send.scan-button"
                disabled={disabled}
                accessible={true}
                accessibilityLabel={translate('send.scan-acc') as string}
                onPress={() => {
                  setQrcodeModalVisible(true);
                }}>
                <FontAwesomeIcon style={{ margin: 5 }} size={48} icon={faQrcode} color={colors.border} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default InputTextAddress;
