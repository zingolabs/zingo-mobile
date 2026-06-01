/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { showConfirm } from '../../../app/showConfirm';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useTheme,
} from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faAddressCard,
  faQrcode,
  faTrashCan,
  faPencil,
  faPaperPlane,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';

import FadeText from '../../Components/FadeText';
import {
  AddressBookActionEnum,
  AddressBookFileClass,
  SendPageStateClass,
  ToAddrClass,
  ModeEnum,
  RouteEnum,
  SelectServerEnum,
} from '../../../app/AppState';
import Utils from '../../../app/utils';
import { ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';

type AbSummaryLineProps = {
  index: number;
  item: AddressBookFileClass;
  openAbDetail: (index: number, action: AddressBookActionEnum) => void;
  handleScrollToTop: () => void;
  doAction: (
    action: AddressBookActionEnum,
    label: string,
    address: string,
    color: string,
  ) => void;
  addressProtected?: boolean;
};
const AbSummaryLine: React.FunctionComponent<AbSummaryLineProps> = ({
  index,
  item,
  openAbDetail,
  handleScrollToTop,
  doAction,
  addressProtected,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    readOnly,
    mode,
    totalBalance,
    selectServer,
    setSendPageState,
  } = context;
  const { colors } = useTheme() as ThemeType;

  const displayAddress: string = item.address
    ? Utils.trimToSmall(item.address, 7)
    : (translate('info.unknown') as string);
  const displayContact: string = item.label
    ? item.label.length > 20
      ? Utils.trimToSmall(item.label, 8)
      : item.label
    : (translate('info.unknown') as string);

  const onPressDelete = () => {
    showConfirm({
      title: translate('addressbook.delete-title') as string,
      message: translate('addressbook.delete-alert') as string,
      buttons: [
        {
          text: translate('confirm') as string,
          onPress: () =>
            doAction(
              AddressBookActionEnum.Delete,
              item.label,
              item.address,
              item.color ? item.color : '',
            ),
        },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
    });
  };

  //console.log('render Ab SummaryLine - 5', index);

  return (
    <View
      testID={`addressbooklist.${index + 1}`}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          marginTop: 15,
          paddingBottom: 15,
          borderBottomWidth: addressProtected ? 3 : 1,
          borderBottomColor: addressProtected ? colors.zingo : colors.border,
          opacity: addressProtected ? 0.5 : 1,
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (!addressProtected) {
                openAbDetail(index, AddressBookActionEnum.Modify);
                handleScrollToTop();
              }
            }}
          >
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
              <FontAwesomeIcon
                style={{ marginHorizontal: 10 }}
                size={20}
                icon={item.own ? faWallet : faAddressCard}
                color={
                  addressProtected || item.own
                    ? colors.zingo
                    : item.color
                      ? item.color
                      : colors.primarydisabled
                }
              />
              <FadeText
                style={{
                  fontSize: 18,
                  marginHorizontal: 10,
                  color: addressProtected ? colors.zingo : colors.primary,
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
                size={20}
                icon={faQrcode}
                color={colors.zingo}
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
        {!addressProtected && (
          <View
            style={{
              width: 50,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              style={{ zIndex: 999, padding: 10 }}
              onPress={() => {
                openAbDetail(index, AddressBookActionEnum.Modify);
                handleScrollToTop();
              }}
            >
              <FontAwesomeIcon
                style={{ opacity: 0.8 }}
                size={20}
                icon={faPencil}
                color={colors.money}
              />
            </TouchableOpacity>
          </View>
        )}
        {!readOnly &&
          selectServer !== SelectServerEnum.offline &&
          !addressProtected &&
          !(
            mode === ModeEnum.basic &&
            totalBalance &&
            // because the action is related with `send`.
            totalBalance.totalSpendableBalance <= 0
          ) && (
            <View
              style={{
                width: 50,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <TouchableOpacity
                style={{ zIndex: 999, padding: 10 }}
                onPress={() => {
                  // enviar
                  const sendPageState = new SendPageStateClass(
                    new ToAddrClass(0),
                  );
                  sendPageState.toaddr.to = item.address;
                  setSendPageState(sendPageState);
                  navigation.navigate(RouteEnum.HomeStack, {
                    screen: RouteEnum.Send,
                  });
                }}
              >
                <FontAwesomeIcon
                  size={24}
                  icon={faPaperPlane}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        {!addressProtected && (
          <View
            style={{
              width: 50,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              style={{ zIndex: 999, padding: 10 }}
              onPress={() => onPressDelete()}
            >
              <FontAwesomeIcon
                style={{ opacity: 0.8 }}
                size={20}
                icon={faTrashCan}
                color={colors.money}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default React.memo(AbSummaryLine);
