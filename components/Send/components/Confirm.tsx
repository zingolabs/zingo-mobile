/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FadeText from '../../Components/FadeText';
import BoldText from '../../Components/BoldText';
import RegText from '../../Components/RegText';
import ZecAmount from '../../Components/ZecAmount';
import CurrencyAmount from '../../Components/CurrencyAmount';
import Button from '../../Components/Button';
import { useTheme } from '@react-navigation/native';
import { ContextAppLoaded } from '../../../app/context';
import Header from '../../Header';
import { RPCParseAddressType } from '../../../app/rpc/types/RPCParseAddressType';
import AddressItem from '../../Components/AddressItem';
import simpleBiometrics from '../../../app/simpleBiometrics';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { ThemeType } from '../../../app/types';
import Utils from '../../../app/utils';
import {
  ButtonTypeEnum,
  CommandEnum,
  PrivacyLevelFromEnum,
  GlobalConst,
  SendPageStateClass,
} from '../../../app/AppState';
import { RPCAddressKindEnum } from '../../../app/rpc/enums/RPCAddressKindEnum';
import { RPCReceiversEnum } from '../../../app/rpc/enums/RPCReceiversEnum';
import { RPCParseAddressStatusEnum } from '../../../app/rpc/enums/RPCParseAddressStatusEnum';
import { useMagicModal } from 'react-native-magic-modal';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';

type ConfirmProps = {
  calculatedFee: number;
  parseAddressInfoJSON: RPCParseAddressType;
  donationAmount: number;
  confirmSend: (s: SendPageStateClass) => void;
  sendAllAmount: boolean;
  calculateFeeWithPropose: (
    amount: string,
    address: string,
    memo: string,
    includeUAMemo: boolean,
    command: CommandEnum.send | CommandEnum.sendall,
  ) => Promise<void>;
  sendPageState: SendPageStateClass;
};
const Confirm: React.FunctionComponent<ConfirmProps> = ({
  confirmSend,
  calculatedFee,
  parseAddressInfoJSON,
  donationAmount,
  sendAllAmount,
  calculateFeeWithPropose,
  sendPageState,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    info,
    translate,
    currency,
    zecPrice,
    defaultUnifiedAddress,
    privacy,
    totalBalance,
    addLastSnackbar,
    server,
    security,
    language,
    snackbars,
    removeFirstSnackbar,
  } = context;
  const { colors } = useTheme()  as ThemeType;
  const { hide } = useMagicModal();
  const { top, bottom, right, left } = useSafeAreaInsets();
  moment.locale(language);
  const { clear } = useToast();

  const [privacyLevel, setPrivacyLevel] = useState<string | null>(null);
  const [sendingTotal, setSendingTotal] = useState<number>(0);

  const memoTotal: string = Utils.buildMemo(
    sendPageState.toaddr.memo,
    sendPageState.toaddr.includeUAMemo,
    defaultUnifiedAddress,
  );

  /**
   * Returns the privacy level for the transaction.
   * It will try to parse the address and determine the privacy level
   * based on the address kind and the senders balance.
   * @returns {string} The privacy level.
   */
  const getPrivacyLevel = useCallback(async () => {
    let from: PrivacyLevelFromEnum = PrivacyLevelFromEnum.nonePrivacyLevel;
    const totalAmount: number = Utils.parseStringLocaleToNumberFloat(
      Utils.parseNumberFloatToStringLocale(
        Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) + calculatedFee,
        8,
      ),
    );

    const totalSpendable: number = Utils.parseStringLocaleToNumberFloat(
      Utils.parseNumberFloatToStringLocale(
        totalBalance ? totalBalance.totalSpendable : 0,
        8,
      ),
    );

    console.log('total', totalAmount);
    console.log('spendable', totalBalance?.totalSpendable);

    // amount + fee
    if (totalAmount <= (totalBalance ? totalBalance.confirmedOrchardBalance : 0)) {
      from = PrivacyLevelFromEnum.orchardPrivacyLevel;
    } else if ((totalBalance ? totalBalance.confirmedOrchardBalance : 0) > 0 && totalAmount <= totalSpendable) {
      from = PrivacyLevelFromEnum.orchardAndSaplingPrivacyLevel;
    } else if (totalAmount <= (totalBalance ? totalBalance.confirmedSaplingBalance : 0)) {
      from = PrivacyLevelFromEnum.saplingPrivacyLevel;
    }

    console.log(from);

    if (from === PrivacyLevelFromEnum.nonePrivacyLevel) {
      return '-';
    }

    //console.log('parse-address', sendPageState.toaddr.to, resultJSON.status === RPCParseStatusEnum.successParse);

    if (
      parseAddressInfoJSON.status !== RPCParseAddressStatusEnum.successAddressParse ||
      parseAddressInfoJSON.chain_name !== server.chainName
    ) {
      return '-';
    }

    //console.log(from, result, resultJSON);

    // Private -> orchard to orchard (UA with orchard receiver)
    if (
      from === PrivacyLevelFromEnum.orchardPrivacyLevel &&
      parseAddressInfoJSON.address_kind === RPCAddressKindEnum.unifiedAddressKind &&
      parseAddressInfoJSON.receivers_available?.includes(RPCReceiversEnum.orchardRPCReceiver)
    ) {
      return translate('send.private') as string;
    }

    // Private -> sapling to sapling (ZA or UA with sapling receiver and NO orchard receiver)
    if (
      from === PrivacyLevelFromEnum.saplingPrivacyLevel &&
      (parseAddressInfoJSON.address_kind === RPCAddressKindEnum.saplingAddressKind ||
        (parseAddressInfoJSON.address_kind === RPCAddressKindEnum.unifiedAddressKind &&
          parseAddressInfoJSON.receivers_available?.includes(RPCReceiversEnum.saplingRPCReceiver) &&
          !parseAddressInfoJSON.receivers_available?.includes(RPCReceiversEnum.orchardRPCReceiver)))
    ) {
      return translate('send.private') as string;
    }

    // Amount Revealed -> orchard to sapling (ZA or UA with sapling receiver)
    if (
      from === PrivacyLevelFromEnum.orchardPrivacyLevel &&
      (parseAddressInfoJSON.address_kind === RPCAddressKindEnum.saplingAddressKind ||
        (parseAddressInfoJSON.address_kind === RPCAddressKindEnum.unifiedAddressKind &&
          parseAddressInfoJSON.receivers_available?.includes(RPCReceiversEnum.saplingRPCReceiver)))
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Amount Revealed -> sapling to orchard (UA with orchard receiver)
    if (
      from === PrivacyLevelFromEnum.saplingPrivacyLevel &&
      parseAddressInfoJSON.address_kind === RPCAddressKindEnum.unifiedAddressKind &&
      parseAddressInfoJSON.receivers_available?.includes(RPCReceiversEnum.orchardRPCReceiver)
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Amount Revealed -> sapling+orchard to orchard or sapling (UA with orchard receiver or ZA or
    // UA with sapling receiver)
    if (
      from === PrivacyLevelFromEnum.orchardAndSaplingPrivacyLevel &&
      (parseAddressInfoJSON.address_kind === RPCAddressKindEnum.saplingAddressKind ||
        (parseAddressInfoJSON.address_kind === RPCAddressKindEnum.unifiedAddressKind &&
          (parseAddressInfoJSON.receivers_available?.includes(RPCReceiversEnum.orchardRPCReceiver) ||
          parseAddressInfoJSON.receivers_available?.includes(RPCReceiversEnum.saplingRPCReceiver))))
    ) {
      return translate('send.amountrevealed') as string;
    }

    // Deshielded -> orchard or sapling or orchard+sapling to transparent
    if (
      (from === PrivacyLevelFromEnum.orchardPrivacyLevel ||
        from === PrivacyLevelFromEnum.saplingPrivacyLevel ||
        from === PrivacyLevelFromEnum.orchardAndSaplingPrivacyLevel) &&
      (parseAddressInfoJSON.address_kind === RPCAddressKindEnum.transparentAddressKind ||
        parseAddressInfoJSON.address_kind === RPCAddressKindEnum.texAddressKind)
    ) {
      return translate('send.deshielded') as string;
    }

    // whatever else
    return '-';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    calculatedFee,
    sendPageState.toaddr.amount,
    sendPageState.toaddr.to,
    server.chainName,
    totalBalance,
    totalBalance?.confirmedOrchardBalance,
    totalBalance?.confirmedSaplingBalance,
    translate,
  ]);

  const confirmSendBiometrics = async () => {
    const resultBio = security.sendConfirm ? await simpleBiometrics({ translate: translate }) : true;
    // can be:
    // - true      -> the user do pass the authentication
    // - false     -> the user do NOT pass the authentication
    // - undefined -> no biometric authentication available -> Passcode.
    //console.log('BIOMETRIC --------> ', resultBio);
    if (resultBio === false) {
      // snack with Error
      addLastSnackbar({ message: translate('biometrics-error') as string });
    } else {
      confirmSend(sendPageState);
    }
  };

  useEffect(() => {
    const sendingTot =
      Utils.parseStringLocaleToNumberFloat(sendPageState.toaddr.amount) + calculatedFee + donationAmount;
    setSendingTotal(sendingTot);
  }, [calculatedFee, donationAmount, sendPageState.toaddr.amount]);

  useEffect(() => {
    (async () => {
      setPrivacyLevel(await getPrivacyLevel());
    })();
  }, [getPrivacyLevel]);

  useEffect(() => {
    calculateFeeWithPropose(
      sendPageState.toaddr.amount,
      sendPageState.toaddr.to,
      sendPageState.toaddr.memo,
      sendPageState.toaddr.includeUAMemo,
      CommandEnum.send,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToastProvider>
      <View
        style={{
          marginTop: top,
          marginBottom: bottom,
          marginRight: right,
          marginLeft: left,
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Snackbars
          snackbars={snackbars}
          removeFirstSnackbar={removeFirstSnackbar}
          translate={translate}
        />

        <Header
          title={translate('send.confirm-title') as string}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={() => {
            clear();
            hide();
          }}
        />
        <ScrollView
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          indicatorStyle={'white'}
          testID="send.confirm.scroll-view"
          style={{ height: '80%', maxHeight: '80%' }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}>
          <View
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: 25,
              padding: 10,
              borderWidth: 1,
              borderRadius: 10,
              borderColor: colors.border,
            }}>
            <BoldText style={{ textAlign: 'center', textTransform: 'capitalize' }}>
              {translate('send.sending-title') as string}
            </BoldText>

            <ZecAmount
              currencyName={info.currencyName}
              amtZec={sendingTotal}
              privacy={false}
              size={36}
              smallPrefix={true}
            />
            <CurrencyAmount amtZec={sendingTotal} price={zecPrice.zecPrice} currency={currency} privacy={false} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ margin: 10 }}>
              <FadeText>{translate('send.confirm-privacy-level') as string}</FadeText>
              {!privacyLevel ? (
                <ActivityIndicator
                  size={Platform.OS === GlobalConst.platformOSios ? 'small' : 12}
                  color={colors.primary}
                />
              ) : (
                <RegText>{privacyLevel}</RegText>
              )}
            </View>
          </View>

          <FadeText style={{ marginTop: 0, marginLeft: 10 }}>{translate('send.fee') as string}</FadeText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 10 }}>
            <ZecAmount currencyName={info.currencyName} size={18} amtZec={calculatedFee} privacy={privacy} />
            <CurrencyAmount
              style={{ fontSize: 18 }}
              amtZec={calculatedFee}
              price={zecPrice.zecPrice}
              currency={currency}
              privacy={privacy}
            />
          </View>

          {[sendPageState.toaddr].map(to => {
            return (
              <View key={`${to.id}-${to.to}`} style={{ margin: 10 }}>
                <FadeText>{translate('send.to') as string}</FadeText>
                <AddressItem address={to.to} withIcon={true} />

                {donationAmount > 0 && (
                  <>
                    <FadeText style={{ marginTop: 10 }}>{translate('send.confirm-donation') as string}</FadeText>
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}>
                      <ZecAmount currencyName={info.currencyName} size={18} amtZec={donationAmount} privacy={privacy} />
                      <CurrencyAmount
                        style={{ fontSize: 18 }}
                        amtZec={donationAmount}
                        price={zecPrice.zecPrice}
                        currency={currency}
                        privacy={privacy}
                      />
                    </View>
                  </>
                )}

                <FadeText style={{ marginTop: 10 }}>{translate('send.confirm-amount') as string}</FadeText>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}>
                  <ZecAmount
                    currencyName={info.currencyName}
                    size={18}
                    amtZec={Utils.parseStringLocaleToNumberFloat(to.amount)}
                    privacy={privacy}
                  />
                  <CurrencyAmount
                    style={{ fontSize: 18 }}
                    amtZec={Utils.parseStringLocaleToNumberFloat(to.amount)}
                    price={zecPrice.zecPrice}
                    currency={currency}
                    privacy={privacy}
                  />
                </View>
                {!!memoTotal && (
                  <>
                    <FadeText style={{ marginTop: 10 }}>{translate('send.confirm-memo') as string}</FadeText>
                    <RegText testID="send.confirm-memo" selectable={true}>
                      {memoTotal}
                    </RegText>
                  </>
                )}
              </View>
            );
          })}
          <View style={{ marginBottom: 30 }} />
        </ScrollView>

        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}>
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
            <Button
              type={ButtonTypeEnum.Primary}
              title={sendAllAmount ? (translate('send.confirm-button-all') as string) : (translate('confirm') as string)}
              onPress={() => confirmSendBiometrics()}
            />
          </View>
        </View>
      </View>
    </ToastProvider>
  );
};

export default Confirm;
