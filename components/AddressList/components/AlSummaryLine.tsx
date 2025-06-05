/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faQrcode, faPencil, faPaperPlane, faWallet } from '@fortawesome/free-solid-svg-icons';

import FadeText from '../../Components/FadeText';
import {
  SendPageStateClass,
  ToAddrClass,
  ModeEnum,
  RouteEnums,
  SelectServerEnum,
  UnifiedAddressClass,
  TransparentAddressClass,
  AddressBookFileClass,
} from '../../../app/AppState';
import Utils from '../../../app/utils';
import { ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

type AlSummaryLineProps = {
  index: number;
  item: UnifiedAddressClass | TransparentAddressClass;
};
const AlSummaryLine: React.FunctionComponent<AlSummaryLineProps> = ({
  index,
  item,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, navigationHome, readOnly, mode, totalBalance, language, selectServer, setSendPageState, closeAllModals, addressBook } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);

  const displayAddress: string = item.address ? Utils.trimToSmall(item.address, 7) : (translate('info.unknown') as string);
  const label: string = addressBook.filter((ab: AddressBookFileClass) => ab.address === item.address)[0].label;
  const displayContact: string = label
    ? label.length > 20
      ? Utils.trimToSmall(label, 8)
      : label
    : (translate('info.unknown') as string);

  //console.log('render Ab SummaryLine - 5', index);

  return (
    <View testID={`addressbooklist.${index + 1}`} style={{ display: 'flex', flexDirection: 'column' }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          marginTop: 15,
          paddingBottom: 15,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          opacity: 1,
        }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-start' }}>
          <TouchableOpacity
            onPress={() => {
            }}>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <FontAwesomeIcon
                style={{ marginHorizontal: 10 }}
                size={24}
                icon={faWallet}
                color={colors.zingo}
              />
              <FadeText
                style={{
                  fontSize: 18,
                  marginHorizontal: 10,
                  color: colors.primary,
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
        <View style={{ width: 50, justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ zIndex: 999, padding: 10 }}
            onPress={() => {
            }}>
            <FontAwesomeIcon style={{ opacity: 0.8 }} size={25} icon={faPencil} color={colors.money} />
          </TouchableOpacity>
        </View>
        {!readOnly &&
          selectServer !== SelectServerEnum.offline &&
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
                  closeAllModals();
                  navigationHome?.navigate(RouteEnums.Home, {
                    screen: translate('loadedapp.send-menu'),
                    initial: false,
                  });
                }}>
                <FontAwesomeIcon size={30} icon={faPaperPlane} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
      </View>
    </View>
  );
};

export default React.memo(AlSummaryLine);
