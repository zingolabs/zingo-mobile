import React from 'react';
import { Pressable, TextStyle, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { XIcon } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Address } from './Address';
import { magicModal, MagicModalHideReason } from 'react-native-magic-modal';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../../app/types/ThemeType';

interface ExpandableAddressProps {
  address: string;
  style?: TextStyle;
  renderModal?: (onClose: () => void) => React.ReactNode;
}

export function ExpandableAddress({ address, style, renderModal }: ExpandableAddressProps) {
  const { colors } = useTheme() as unknown as ThemeType;

  const onExpand = () => {
    const onClose = () => magicModal.hide({ reason: MagicModalHideReason.INTENTIONAL_HIDE });

    const DefaultModal = () => (
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
            <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>Your Address</Text>
            <Text style={{ color: '#cbd5e1', fontSize: 16, marginBottom: 12 }}>{address}</Text>
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(address);
              }}
              style={{
                borderColor: '#3B4B5F',
                backgroundColor: '#2A394D',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 5,
                borderWidth: 1,
              }}>
              <Text style={{ color: '#ccc', fontSize: 16 }}>Copy address</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );

    magicModal.show(() => (renderModal ? renderModal(onClose) : <DefaultModal />));
  };

  return (
    <Pressable onPress={onExpand}>
      <Address address={address} style={style} />
    </Pressable>
  );
}
