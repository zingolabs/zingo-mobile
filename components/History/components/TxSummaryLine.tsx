/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowDown, faArrowUp, faRefresh } from '@fortawesome/free-solid-svg-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';
import { TransactionType, TxDetailType } from '../../../app/AppState';
import Utils from '../../../app/utils';
import { ThemeType } from '../../../app/types';
import moment from 'moment';
import 'moment/locale/es';
import { ContextAppLoaded } from '../../../app/context';

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
  const { translate, language, privacy, info, mode } = context;
  const { colors } = useTheme() as unknown as ThemeType;

  const amount = tx.txDetails.reduce((s, d) => s + d.amount, 0) + (tx.fee ? tx.fee : 0);

  const amountColor =
    tx.confirmations === 0 ? colors.primaryDisabled : tx.type === 'Received' ? colors.primary : colors.text;

  const txIcon = tx.confirmations === 0 ? faRefresh : tx.type === 'Received' ? faArrowDown : faArrowUp;
  moment.locale(language);

  // if no address I'm going to put txid here.
  const displayAddress = Utils.trimToSmall(tx.txid, 7);

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
          <View style={{ display: 'flex', flexGrow: 1 }}>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
              }}>
              <FadeText style={{ fontSize: 18 }}>{displayAddress}</FadeText>
              {tx.fee && (
                <ZecAmount
                  style={{ flexGrow: 1, justifyContent: 'flex-end', paddingRight: 5, opacity: !amount ? 1 : 0.6 }}
                  size={15}
                  currencyName={info.currencyName ? info.currencyName : ''}
                  color={amountColor}
                  amtZec={tx.fee}
                  privacy={privacy}
                  label={translate('send.fee') as string}
                />
              )}
            </View>
            <View style={{ display: 'flex', flexGrow: 1 }}>
              {((tx.txDetails.length === 1 && tx.type === 'Sent') || (tx.txDetails.length > 1 && mode !== 'basic')) &&
                tx.txDetails.map((txd: TxDetailType) => {
                  return (
                    <View
                      key={txd.address + txd.pool}
                      style={{ display: 'flex', flexDirection: 'row', marginLeft: 10 }}>
                      {!!txd.address && (
                        <>
                          {!txd.address && <FadeText style={{ fontSize: 15 }}>{'Unknown'}</FadeText>}
                          {!!txd.address && (
                            <FadeText style={{ fontSize: 15 }}>{Utils.trimToSmall(txd.address, 10)}</FadeText>
                          )}
                        </>
                      )}
                      {!!txd.pool && <FadeText style={{ fontSize: 15 }}>{txd.pool}</FadeText>}
                      <ZecAmount
                        style={{
                          flexGrow: 1,
                          justifyContent: 'flex-end',
                          paddingRight: 10,
                          margin: 0,
                        }}
                        size={15}
                        currencyName={info.currencyName ? info.currencyName : ''}
                        color={amountColor}
                        amtZec={txd.amount}
                        privacy={privacy}
                      />
                    </View>
                  );
                })}
            </View>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
              }}>
              <FadeText style={{ fontWeight: 'bold', color: amountColor }}>
                {tx.type === 'Sent'
                  ? (translate('history.sent') as string)
                  : tx.type === 'Received'
                  ? (translate('history.receive') as string)
                  : (translate('history.sendtoself') as string)}
              </FadeText>
              <FadeText>{tx.time ? moment((tx.time || 0) * 1000).format('MMM D, h:mm a') : '--'}</FadeText>
              {!!amount && (
                <ZecAmount
                  style={{ flexGrow: 1, justifyContent: 'flex-end', paddingRight: 10, margin: 0 }}
                  size={18}
                  currencyName={info.currencyName ? info.currencyName : ''}
                  color={amountColor}
                  amtZec={amount}
                  privacy={privacy}
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default React.memo(TxSummaryLine);
