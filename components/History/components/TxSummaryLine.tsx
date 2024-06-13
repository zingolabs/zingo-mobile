/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { IconDefinition, faArrowDown, faArrowUp, faRefresh, faComment } from '@fortawesome/free-solid-svg-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import { TransactionType, TransactionTypeEnum } from '../../../app/AppState';
import { ThemeType } from '../../../app/types';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { ContextAppLoaded } from '../../../app/context';
import AddressItem from '../../Components/AddressItem';

type TxSummaryLineProps = {
  index: number;
  month: string;
  tx: TransactionType;
  setTxDetail: (t: TransactionType) => void;
  setTxDetailModalShowing: (b: boolean) => void;
};
const TxSummaryLine: React.FunctionComponent<TxSummaryLineProps> = ({
  index,
  tx,
  month,
  setTxDetail,
  setTxDetailModalShowing,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, language, privacy, info } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [amountColor, setAmountColor] = useState<string>(colors.primaryDisabled);
  const [txIcon, setTxIcon] = useState<IconDefinition>(faRefresh);
  const [displayAddress, setDisplayAddress] = useState<React.JSX.Element | null>(null);
  const [haveMemo, setHaveMemo] = useState<boolean>(false);

  useEffect(() => {
    const amountCo =
      tx.confirmations === 0
        ? colors.primaryDisabled
        : tx.type === TransactionTypeEnum.Received
        ? colors.primary
        : colors.text;

    setAmountColor(amountCo);
  }, [colors.primary, colors.primaryDisabled, colors.text, tx.confirmations, tx.type]);

  useEffect(() => {
    const txIc =
      tx.confirmations === 0 ? faRefresh : tx.type === TransactionTypeEnum.Received ? faArrowDown : faArrowUp;
    setTxIcon(txIc);
  }, [tx.confirmations, tx.type]);

  useEffect(() => {
    // if no address I'm going to put txid here.
    const displayAdd =
      tx.txDetails.length === 1 && tx.txDetails[0].address ? (
        <AddressItem address={tx.txDetails[0].address} oneLine={true} closeModal={() => {}} openModal={() => {}} />
      ) : null;
    setDisplayAddress(displayAdd);

    // if have any memo
    const memos = tx.txDetails
      .filter(txd => txd.memos && txd.memos.length > 0)
      .map(txd => txd.memos)
      .flat()
      .filter(m => !!m);
    setHaveMemo(memos && memos.length > 0);
  }, [tx.txDetails]);

  //console.log('render TxSummaryLine - 5', index);

  return (
    <View testID={`transactionList.${index + 1}`} style={{ display: 'flex', flexDirection: 'column' }}>
      {month !== '' && (
        <View
          style={{
            paddingLeft: 15,
            paddingTop: 5,
            paddingBottom: 5,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.card,
            backgroundColor: colors.background,
          }}>
          <FadeText>{month}</FadeText>
        </View>
      )}
      <TouchableOpacity
        onPress={() => {
          setTxDetail(tx);
          setTxDetailModalShowing(true);
        }}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 15,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
          <View style={{ display: 'flex' }}>
            <FontAwesomeIcon
              style={{ marginLeft: 5, marginRight: 5, marginTop: 0 }}
              size={30}
              icon={txIcon}
              color={amountColor}
            />
          </View>
          <View style={{ display: 'flex' }}>
            {!!displayAddress && displayAddress}
            <View
              style={{
                display: 'flex',
                flexDirection:
                  tx.type === TransactionTypeEnum.Received || tx.type === TransactionTypeEnum.SendToSelf
                    ? 'column'
                    : 'row',
                alignItems: 'flex-start',
              }}>
              <FadeText
                style={{
                  opacity: 1,
                  fontWeight: 'bold',
                  color: amountColor,
                  fontSize: displayAddress || tx.confirmations === 0 ? 14 : 18,
                }}>
                {tx.type === TransactionTypeEnum.Sent && tx.confirmations === 0
                  ? (translate('history.sending') as string)
                  : tx.type === TransactionTypeEnum.Sent && tx.confirmations > 0
                  ? (translate('history.sent') as string)
                  : tx.type === TransactionTypeEnum.Received && tx.confirmations === 0
                  ? (translate('history.receiving') as string)
                  : tx.type === TransactionTypeEnum.Received && tx.confirmations > 0
                  ? (translate('history.received') as string)
                  : tx.type === TransactionTypeEnum.SendToSelf && tx.confirmations === 0
                  ? (translate('history.sendingtoself') as string)
                  : (translate('history.sendtoself') as string)}
              </FadeText>
              <View style={{ display: 'flex', flexDirection: 'row' }}>
                <FadeText>{tx.time ? moment((tx.time || 0) * 1000).format('MMM D, h:mm a') : '--'}</FadeText>
                {haveMemo && (
                  <FontAwesomeIcon
                    style={{ marginLeft: 10 }}
                    size={15}
                    icon={faComment}
                    color={colors.primaryDisabled}
                  />
                )}
              </View>
            </View>
          </View>
          <ZecAmount
            style={{ flexGrow: 1, alignSelf: 'auto', justifyContent: 'flex-end', paddingRight: 5 }}
            size={18}
            currencyName={info.currencyName}
            color={amountColor}
            amtZec={tx.txDetails.reduce((s, d) => s + d.amount, 0) + (tx.fee ? tx.fee : 0)}
            privacy={privacy}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(TxSummaryLine);
