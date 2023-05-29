/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-simple-toast';
import { useTheme } from '@react-navigation/native';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

import FadeText from './FadeText';
//import Button from '../../Button';
import Utils from '../../app/utils';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';

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
  const context = useContext(ContextAppLoaded);
  const { translate, privacy } = context;
  //console.log(`Addresses ${addresses}: ${multipleAddresses}`);
  const { colors } = useTheme() as unknown as ThemeType;
  const [expandAddress, setExpandAddress] = useState(false);
  const [expandQRAddress, setExpandQRAddress] = useState(false);

  useEffect(() => {
    if (privacy) {
      setExpandAddress(false);
      setExpandQRAddress(false);
    } else {
      setExpandAddress(true);
      setExpandQRAddress(true);
    }
  }, [privacy]);

  useEffect(() => {
    if (!expandAddress && !privacy) {
      setExpandAddress(true);
    }
  }, [expandAddress, privacy]);

  useEffect(() => {
    if (!expandQRAddress && !privacy) {
      setExpandQRAddress(true);
    }
  }, [expandQRAddress, privacy]);

  const multi = total > 1;

  // 30 characters per line
  const numLines = addressKind === 't' ? 2 : address.length / 30;
  const numChars = addressKind === 't' ? 5 : 12;
  const chunks = Utils.splitStringIntoChunks(address, Number(numLines.toFixed(0)));

  const doCopy = () => {
    if (address) {
      Clipboard.setString(address);
      Toast.show(translate('history.addresscopied') as string, Toast.LONG);
    }
  };

  return (
    <View style={{ flexDirection: 'column' }}>
      <ScrollView
        contentContainerStyle={[
          {
            alignItems: 'center',
          },
        ]}>
        <View style={{ marginTop: 20, marginHorizontal: 20, padding: 10, backgroundColor: colors.border }}>
          <TouchableOpacity
            onPress={() => {
              if (address) {
                Clipboard.setString(address);
                Toast.show(translate('history.addresscopied') as string, Toast.LONG);
                setExpandQRAddress(true);
                if (privacy) {
                  setTimeout(() => {
                    setExpandQRAddress(false);
                  }, 5000);
                }
              }
            }}>
            {expandQRAddress ? (
              <QRCode value={address} size={200} ecl="L" backgroundColor={colors.border} />
            ) : (
              <View
                style={{
                  width: 200,
                  height: 200,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.text,
                }}>
                <Text style={{ color: colors.zingo, textDecorationLine: 'underline', marginTop: 15, minHeight: 48 }}>
                  {translate('seed.tapreveal') as string}
                </Text>
              </View>
            )}
          </TouchableOpacity>
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
              <TouchableOpacity
                accessible={true}
                accessibilityLabel={translate('send.scan-acc') as string}
                onPress={prev}>
                <FontAwesomeIcon style={{ margin: 5 }} size={48} icon={faChevronLeft} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          <View style={{ width: 150, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity onPress={doCopy}>
              <Text style={{ color: colors.text, textDecorationLine: 'underline', marginTop: 15, minHeight: 48 }}>
                {translate('seed.tapcopy') as string}
              </Text>
            </TouchableOpacity>
            {multi && (
              <Text style={{ color: colors.primary, marginTop: -25 }}>
                {index + 1}
                {translate('receive.of') as string}
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
              <TouchableOpacity
                accessible={true}
                accessibilityLabel={translate('send.scan-acc') as string}
                onPress={next}>
                <FontAwesomeIcon style={{ margin: 5 }} size={48} icon={faChevronRight} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            if (address) {
              Clipboard.setString(address);
              Toast.show(translate('history.addresscopied') as string, Toast.LONG);
              setExpandAddress(true);
              if (privacy) {
                setTimeout(() => {
                  setExpandAddress(false);
                }, 5000);
              }
            }
          }}>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginBottom: 30,
            }}>
            {!expandAddress && <FadeText>{Utils.trimToSmall(address, numChars)}</FadeText>}
            {expandAddress &&
              chunks.map(c => (
                <FadeText
                  key={c}
                  style={{
                    flexBasis: '100%',
                    textAlign: 'center',
                    fontFamily: 'verdana',
                    fontSize: 16,
                    color: colors.text,
                  }}>
                  {c}
                </FadeText>
              ))}
          </View>
        </TouchableOpacity>

        {/*multi && (
          <View style={{ display: 'flex', flexDirection: 'row', marginTop: 10, alignItems: 'center', marginBottom: 100 }}>
            <Button
              type="Secondary"
              title={translate('receive.prev')}
              style={{ width: '25%', margin: 10 }}
              onPress={prev}
            />
            <FadeText>
              {index + 1}
              {translate('receive.of')}
              {total}
            </FadeText>
            <Button
              type="Secondary"
              title={translate('receive.next')}
              style={{ width: '25%', margin: 10 }}
              onPress={next}
            />
          </View>
        )*/}
      </ScrollView>
    </View>
  );
};

export default SingleAddress;
