/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, Platform, ScrollView, TouchableOpacity, Text } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-simple-toast';
import { useTheme } from '@react-navigation/native';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

import FadeText from '../../Components/FadeText';
//import Button from '../../Button';
import Utils from '../../../app/utils';
import { ThemeType } from '../../../app/types';
import { ContextLoaded } from '../../../app/context';

type SingleAddressProps = {
  address: string;
  addressKind: string;
  index: number;
  total: number;
  prev: () => void;
  next: () => void;
};

const SingleAddress: React.FunctionComponent<SingleAddressProps> = ({
  address,
  addressKind,
  index,
  total,
  prev,
  next,
}) => {
  const context = useContext(ContextLoaded);
  const { translate } = context;
  //console.log(`Addresses ${addresses}: ${multipleAddresses}`);
  const { colors } = useTheme() as unknown as ThemeType;

  const multi = total > 1;

  // 30 characters per line
  const numLines = addressKind === 't' ? 2 : address.length / 30;
  const chunks = Utils.splitStringIntoChunks(address, Number(numLines.toFixed(0)));
  const fixedWidthFont = Platform.OS === 'android' ? 'monospace' : 'Courier';

  const doCopy = () => {
    if (address) {
      Clipboard.setString(address);
      Toast.show(translate('transactions.addresscopied'), Toast.LONG);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        {
          alignItems: 'center',
        },
      ]}>
      <View style={{ marginTop: 20, padding: 10, backgroundColor: colors.border }}>
        <QRCode value={address} size={200} ecl="L" backgroundColor={colors.border} />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginVertical: 15,
          width: '100%',
          justifyContent: 'space-evenly',
        }}>
        {multi && (
          <View
            style={{
              width: 58,
              borderColor: colors.primary,
              borderWidth: 2,
              borderRadius: 10,
            }}>
            <TouchableOpacity accessible={true} accessibilityLabel={translate('send.scan-acc')} onPress={prev}>
              <FontAwesomeIcon style={{ margin: 5 }} size={48} icon={faChevronLeft} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={{ width: 150, justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity onPress={doCopy}>
            <Text style={{ color: colors.text, textDecorationLine: 'underline', marginTop: 15, minHeight: 48 }}>
              {translate('seed.tapcopy')}
            </Text>
          </TouchableOpacity>
          {multi && (
            <Text style={{ color: colors.primary, marginTop: -25 }}>
              {index + 1}
              {translate('legacy.of')}
              {total}
            </Text>
          )}
        </View>
        {multi && (
          <View
            style={{
              width: 58,
              borderColor: colors.primary,
              borderWidth: 2,
              borderRadius: 10,
            }}>
            <TouchableOpacity accessible={true} accessibilityLabel={translate('send.scan-acc')} onPress={next}>
              <FontAwesomeIcon style={{ margin: 5 }} size={48} icon={faChevronRight} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View
        style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 30 }}>
        {chunks.map(c => (
          <FadeText
            key={c}
            style={{
              flexBasis: '100%',
              textAlign: 'center',
              fontFamily: fixedWidthFont,
              fontSize: 18,
              color: colors.text,
            }}>
            {c}
          </FadeText>
        ))}
      </View>

      {/*multi && (
        <View style={{ display: 'flex', flexDirection: 'row', marginTop: 10, alignItems: 'center', marginBottom: 100 }}>
          <Button
            type="Secondary"
            title={translate('legacy.prev')}
            style={{ width: '25%', margin: 10 }}
            onPress={prev}
          />
          <FadeText>
            {index + 1}
            {translate('legacy.of')}
            {total}
          </FadeText>
          <Button
            type="Secondary"
            title={translate('legacy.next')}
            style={{ width: '25%', margin: 10 }}
            onPress={next}
          />
        </View>
      )*/}
    </ScrollView>
  );
};

export default SingleAddress;
