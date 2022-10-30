/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import ZecAmount from './Components/ZecAmount';
import FadeText from './Components/FadeText';
import { View, TouchableOpacity } from 'react-native';
import { Transaction } from '../app/AppState';
import Utils from '../app/utils';
import Moment from 'react-moment';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons';

type TxSummaryLineProps = {
  month: string;
  tx: Transaction;
  setTxDetail: React.Dispatch<React.SetStateAction<Transaction | null>>;
  setTxDetailModalShowing: React.Dispatch<React.SetStateAction<boolean>>;
};
const TxSummaryLine: React.FunctionComponent<TxSummaryLineProps> = ({
  tx,
  month,
  setTxDetail,
  setTxDetailModalShowing,
}) => {
  const { colors } = useTheme();

  const amountColor = tx.confirmations === 0 ? colors.primaryDisabled : tx.amount > 0 ? colors.primary : colors.text;
  const txIcon = tx.amount > 0 ? faArrowDown : faArrowUp;

  const displayAddress =
    tx.detailedTxns && tx.detailedTxns.length > 0 ? Utils.trimToSmall(tx.detailedTxns[0].address, 7) : 'Unknown';

  return (
    <View style={{ display: 'flex', flexDirection: 'column' }}>
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
            marginTop: 15,
            paddingBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
          <FontAwesomeIcon
            style={{ marginLeft: 15, marginRight: 15, marginTop: 5 }}
            size={24}
            icon={txIcon}
            color={amountColor}
          />
          <View style={{ display: 'flex' }}>
            <FadeText style={{ fontSize: 18 }}>{displayAddress}</FadeText>
            <View style={{ display: 'flex', flexDirection: 'row' }}>
              <FadeText>{tx.type === 'sent' ? 'Sent ' : 'Received '}</FadeText>
              <Moment interval={0} format="MMM D, h:mm a" element={FadeText}>
                {(tx?.time || 0) * 1000}
              </Moment>
            </View>
          </View>
          <ZecAmount
            style={{ flexGrow: 1, alignSelf: 'baseline', justifyContent: 'flex-end', paddingRight: 5 }}
            size={18}
            currencyName={'ᙇ'}
            color={amountColor}
            amtZec={tx.amount}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default TxSummaryLine;
