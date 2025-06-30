/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { TextStyle, View, Text, TouchableOpacity } from 'react-native';
import Address from './Address';
import { magicModal, MagicModalHideReason } from 'react-native-magic-modal';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../../app/types/ThemeType';
import { ContextAppLoaded } from '../../../app/context';
import { XIcon } from '../Icons/XIcon';

type DefaultModalProps = {
  address: string;
  onClose: () => void;
  onCopy?: () => void;
};

const DefaultModal: React.FunctionComponent<DefaultModalProps> = ({ address, onClose, onCopy }) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      }}>
      <View
        style={{
          width: '90%',
          padding: 16,
          borderRadius: 8,
          backgroundColor: '#1e293b',
          position: 'relative',
        }}>
        <TouchableOpacity
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
          }}
          hitSlop={10}>
          <XIcon color={colors.zingo} size={24} />
        </TouchableOpacity>
        <View
          style={{
            height: 2,
            width: '100%',
            marginBottom: 6,
          }}
        />

        <View style={{ alignItems: 'flex-start' }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
            {translate('receive.title-basic') as string}
          </Text>
          <Text style={{ color: '#cbd5e1', fontSize: 16, marginBottom: 12 }}>{address}</Text>
          <TouchableOpacity
            onPress={() => {
              onCopy && onCopy();
              onClose();
            }}
            style={{
              borderColor: '#3B4B5F',
              backgroundColor: '#2A394D',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 5,
              borderWidth: 1,
            }}>
            <Text style={{ color: '#ccc', fontSize: 16 }}>{translate('receive.copy-address-button') as string}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

type ExpandableAddressProps = {
  address: string;
  style?: TextStyle;
  renderModal?: (onClose: () => void) => React.ReactElement;
  onCopy?: () => void;
};

const ExpandableAddress: React.FunctionComponent<ExpandableAddressProps> = ({
  address,
  style,
  renderModal,
  onCopy,
}) => {
  const onClose = () => magicModal.hide({ reason: MagicModalHideReason.INTENTIONAL_HIDE });

  const onExpand = async () => {
    return magicModal.show(
      () => (renderModal ? renderModal(onClose) : <DefaultModal address={address} onClose={onClose} onCopy={onCopy} />),
      {},
    ).promise;
  };

  return <Address address={address} style={style} onPress={onExpand} />;
};

export default ExpandableAddress;
