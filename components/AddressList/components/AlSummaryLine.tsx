/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faQrcode,
  faCopy,
  faWallet,
  faTags,
} from '@fortawesome/free-solid-svg-icons';
import Clipboard from '@react-native-clipboard/clipboard';

import FadeText from '../../Components/FadeText';
import {
  UnifiedAddressClass,
  TransparentAddressClass,
  AddressBookFileClass,
  SnackbarDurationEnum,
  ScreenEnum,
} from '../../../app/AppState';
import Utils from '../../../app/utils';
import { ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';

type AlSummaryLineProps = {
  index: number;
  setIndex: (i: number) => void;
  item: UnifiedAddressClass | TransparentAddressClass;
  closeScreen: () => void;
  screenName: ScreenEnum;
};
const AlSummaryLine: React.FunctionComponent<AlSummaryLineProps> = ({
  index,
  setIndex,
  item,
  closeScreen,
  screenName,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addressBook, addLastSnackbar } = context;
  const { colors } = useTheme() as ThemeType;

  const displayAddress: string = item.address
    ? Utils.trimToSmall(item.address, 7)
    : (translate('info.unknown') as string);
  const found: AddressBookFileClass[] = addressBook.filter(
    (ab: AddressBookFileClass) => ab.address === item.address,
  );
  const label: string = found.length > 0 ? found[0].label : '-';
  const displayContact: string =
    label.length > 20 ? Utils.trimToSmall(label, 8) : label;

  const doCopy = () => {
    Clipboard.setString(item.address);
    addLastSnackbar({
      message: translate('history.addresscopied') as string,
      duration: SnackbarDurationEnum.short,
      screenName: [screenName],
    });
  };

  const doQr = () => {
    setIndex(index);
    closeScreen();
  };

  //console.log('render Ab SummaryLine - 5', index);

  return (
    <View style={{ display: 'flex', flexDirection: 'column' }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          marginTop: 15,
          paddingBottom: 15,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          opacity: 1,
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <TouchableOpacity onPress={() => {}}>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <FontAwesomeIcon
                style={{ marginHorizontal: 10 }}
                size={24}
                icon={faTags}
                color={colors.text}
              />
              <FadeText
                style={{
                  fontSize: 18,
                  marginHorizontal: 10,
                  color: colors.primary,
                  opacity: 1,
                  fontWeight: 'bold',
                }}
              >
                {displayContact}
              </FadeText>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <FontAwesomeIcon
                style={{ marginHorizontal: 10 }}
                size={24}
                icon={faWallet}
                color={colors.text}
              />
              <FadeText
                style={{
                  fontSize: 18,
                  marginHorizontal: 10,
                  opacity: 1,
                  fontWeight: 'bold',
                }}
              >
                {displayAddress}
              </FadeText>
            </View>
          </TouchableOpacity>
        </View>
        <View
          style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}
        >
          <TouchableOpacity
            style={{ zIndex: 999, padding: 10 }}
            onPress={() => {
              doCopy();
            }}
          >
            <FontAwesomeIcon
              style={{ opacity: 0.8 }}
              size={25}
              icon={faCopy}
              color={colors.money}
            />
          </TouchableOpacity>
        </View>
        <View
          style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}
        >
          <TouchableOpacity
            style={{ zIndex: 999, padding: 10 }}
            onPress={() => {
              doQr();
            }}
          >
            <FontAwesomeIcon size={30} icon={faQrcode} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default React.memo(AlSummaryLine);
