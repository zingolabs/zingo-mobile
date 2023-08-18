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

type AbSummaryLineProps = {
  index: number;
  month: string;
  tx: TransactionType;
  setTxDetail: (t: TransactionType) => void;
  setTxDetailModalShowing: (b: boolean) => void;
};
const AbSummaryLine: React.FunctionComponent<AbSummaryLineProps> = ({
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
    tx.confirmations === 0 ? colors.primaryDisabled : (tx.amount || 0) > 0 ? colors.primary : colors.text;

  const txIcon = tx.confirmations === 0 ? faRefresh : (tx.amount || 0) >= 0 ? faArrowDown : faArrowUp;
  moment.locale(language);

  const displayAddress =
    tx.detailedTxns && tx.detailedTxns.length > 0 && tx.detailedTxns[0].address
      ? Utils.trimToSmall(tx.detailedTxns[0].address, 7)
      : 'Unknown';

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
            <FadeText style={{ fontSize: 18 }}>{displayAddress}</FadeText>
            <View style={{ display: 'flex', flexDirection: 'row' }}>
              <FadeText>
                {tx.type === 'sent' ? (translate('history.sent') as string) : (translate('history.receive') as string)}
              </FadeText>
              <FadeText>{tx.time ? moment((tx.time || 0) * 1000).format('MMM D, h:mm a') : '--'}</FadeText>
            </View>
          </View>
          <ZecAmount
            style={{ flexGrow: 1, alignSelf: 'baseline', justifyContent: 'flex-end', paddingRight: 5 }}
            size={18}
            currencyName={info.currencyName ? info.currencyName : ''}
            color={amountColor}
            amtZec={tx.amount}
            privacy={privacy}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(AbSummaryLine);
