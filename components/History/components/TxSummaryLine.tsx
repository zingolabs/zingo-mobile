/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowDown, faArrowUp, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import { TransactionType } from '../../../app/AppState';
import Utils from '../../../app/utils';
import { ThemeType } from '../../../app/types';
import moment from 'moment';
import 'moment/locale/es';
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

  const amountColor =
    tx.confirmations === 0 ? colors.primaryDisabled : tx.type === 'Received' ? colors.primary : colors.text;

  const txIcon = tx.confirmations === 0 ? faRefresh : tx.type === 'Received' ? faArrowDown : faArrowUp;
  moment.locale(language);

  // if no address I'm going to put txid here.
  const displayAddress =
    tx.txDetails.length === 1 && tx.txDetails[0].address ? (
      <AddressItem address={tx.txDetails[0].address} oneLine={true} />
    ) : (
      <FadeText style={{ fontSize: 18 }}>{Utils.trimToSmall(tx.txid, 7)}</FadeText>
    );

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
            marginTop: 15,
            paddingBottom: 15,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
          <FontAwesomeIcon
            style={{ marginLeft: 5, marginRight: 5, marginTop: 5 }}
            size={24}
            icon={txIcon}
            color={amountColor}
          />
          <View style={{ display: 'flex' }}>
            {displayAddress}
            <View style={{ display: 'flex', flexDirection: 'row' }}>
              <FadeText style={{ opacity: 1, fontWeight: 'bold', color: amountColor }}>
                {tx.type === 'Sent'
                  ? (translate('history.sent') as string)
                  : tx.type === 'Received'
                  ? (translate('history.received') as string)
                  : (translate('history.sendtoself') as string)}
              </FadeText>
              <FadeText>{tx.time ? moment((tx.time || 0) * 1000).format('MMM D, h:mm a') : '--'}</FadeText>
            </View>
          </View>
          <ZecAmount
            style={{ flexGrow: 1, alignSelf: 'baseline', justifyContent: 'flex-end', paddingRight: 5 }}
            size={18}
            currencyName={info.currencyName ? info.currencyName : ''}
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
