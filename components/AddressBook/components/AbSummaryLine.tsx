/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faAddressCard, faQrcode, faTrashCan, faPencil, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

import FadeText from '../../Components/FadeText';
import {
  AddressBookActionEnum,
  AddressBookFileClass,
  SendPageStateClass,
  ToAddrClass,
  ModeEnum,
  RouteEnums,
  SelectServerEnum,
} from '../../../app/AppState';
import Utils from '../../../app/utils';
import { ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

type AbSummaryLineProps = {
  index: number;
  item: AddressBookFileClass;
  setCurrentItem: (b: number) => void;
  setAction: (action: AddressBookActionEnum) => void;
  setSendPageState: (s: SendPageStateClass) => void;
  closeModal: () => void;
  handleScrollToTop: () => void;
  doAction: (action: AddressBookActionEnum, label: string, address: string, uOrchardAddress: string) => void;
  addressProtected?: boolean;
};
const AbSummaryLine: React.FunctionComponent<AbSummaryLineProps> = ({
  index,
  item,
  setCurrentItem,
  setAction,
  setSendPageState,
  closeModal,
  handleScrollToTop,
  doAction,
  addressProtected,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, navigation, readOnly, mode, totalBalance, language, selectServer } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const displayAddress = item.address ? Utils.trimToSmall(item.address, 7) : 'Unknown';
  const displayContact = item.label
    ? item.label.length > 20
      ? Utils.trimToSmall(item.label, 8)
      : item.label
    : 'Unknown';

  const onPressDelete = () => {
    Alert.alert(
      translate('addressbook.delete-title') as string,
      translate('addressbook.delete-alert') as string,
      [
        {
          text: translate('confirm') as string,
          onPress: () =>
            doAction(
              AddressBookActionEnum.Delete,
              item.label,
              item.address,
              item.uOrchardAddress ? item.uOrchardAddress : '',
            ),
        },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
      { cancelable: false, userInterfaceStyle: 'light' },
    );
  };

  //console.log('render Ab SummaryLine - 5', index);

  return (
    <View testID={`addressbooklist.${index + 1}`} style={{ display: 'flex', flexDirection: 'column' }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          marginTop: 15,
          paddingBottom: 15,
          borderBottomWidth: addressProtected ? 3 : 1,
          borderBottomColor: addressProtected ? colors.zingo : colors.border,
          opacity: addressProtected ? 0.5 : 1,
        }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-start' }}>
          <TouchableOpacity
            onPress={() => {
              if (!addressProtected) {
                setCurrentItem(index);
                setAction(AddressBookActionEnum.Modify);
                handleScrollToTop();
              }
            }}>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <FontAwesomeIcon
                style={{ marginHorizontal: 10 }}
                size={24}
                icon={faAddressCard}
                color={addressProtected ? colors.zingo : colors.primaryDisabled}
              />
              <FadeText
                style={{
                  fontSize: 18,
                  marginHorizontal: 10,
                  color: addressProtected ? colors.zingo : colors.primary,
                  opacity: 1,
                  fontWeight: 'bold',
                }}>
                {displayContact}
              </FadeText>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <FontAwesomeIcon style={{ marginHorizontal: 10 }} size={24} icon={faQrcode} color={colors.zingo} />
              <FadeText style={{ fontSize: 18, marginHorizontal: 10, opacity: 1, fontWeight: 'bold' }}>
                {displayAddress}
              </FadeText>
            </View>
          </TouchableOpacity>
        </View>
        {!addressProtected && (
          <View style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity
              style={{ zIndex: 999, padding: 10 }}
              onPress={() => {
                setCurrentItem(index);
                setAction(AddressBookActionEnum.Modify);
                handleScrollToTop();
              }}>
              <FontAwesomeIcon style={{ opacity: 0.8 }} size={25} icon={faPencil} color={colors.money} />
            </TouchableOpacity>
          </View>
        )}
        {!readOnly &&
          selectServer !== SelectServerEnum.offline &&
          !addressProtected &&
          !(
            mode === ModeEnum.basic &&
            totalBalance &&
            totalBalance.spendableOrchard + totalBalance.spendablePrivate <= 0
          ) && (
            <View style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity
                style={{ zIndex: 999, padding: 10 }}
                onPress={() => {
                  // enviar
                  const sendPageState = new SendPageStateClass(new ToAddrClass(0));
                  sendPageState.toaddr.to = item.address;
                  setSendPageState(sendPageState);
                  closeModal();
                  navigation.navigate(RouteEnums.LoadedApp, {
                    screen: translate('loadedapp.send-menu'),
                    initial: false,
                  });
                }}>
                <FontAwesomeIcon size={30} icon={faPaperPlane} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        {!addressProtected && (
          <View style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ zIndex: 999, padding: 10 }} onPress={() => onPressDelete()}>
              <FontAwesomeIcon style={{ opacity: 0.8 }} size={25} icon={faTrashCan} color={colors.money} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default React.memo(AbSummaryLine);
